
-- 1. Create user_bonus_credits table
CREATE TABLE public.user_bonus_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  granted_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, feature)
);

-- Index for fast lookups
CREATE INDEX idx_user_bonus_credits_user_id ON public.user_bonus_credits(user_id);

-- Enable RLS
ALTER TABLE public.user_bonus_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own bonus credits
CREATE POLICY "Users can view their own bonus credits"
  ON public.user_bonus_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for regular users (only service_role via Edge Function)

-- 2. Update check_and_increment_usage to consider bonus credits
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(_user_id uuid, _feature text, _endpoint text, _metadata jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(allowed boolean, current_usage bigint, usage_limit bigint, current_plan text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_limit bigint;
  v_bonus bigint;
  v_effective_limit bigint;
  v_enabled boolean;
  v_reason text;
  v_count bigint;
  v_start_of_month timestamptz;
BEGIN
  -- 1. Advisory lock on user+feature to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text || _feature));

  -- 2. Get plan info
  SELECT pf.usage_limit, pf.enabled, p.user_plan
  INTO v_limit, v_enabled, v_plan
  FROM profiles p
  LEFT JOIN plan_features pf ON pf.plan = COALESCE(p.user_plan, 'free') AND pf.feature = _feature
  WHERE p.user_id = _user_id;

  -- If no profile found
  IF v_plan IS NULL THEN
    v_plan := 'free';
    SELECT pf.usage_limit, pf.enabled
    INTO v_limit, v_enabled
    FROM plan_features pf
    WHERE pf.plan = 'free' AND pf.feature = _feature;
  END IF;

  -- 3. Check if feature is enabled
  IF v_enabled IS NOT NULL AND v_enabled = false THEN
    RETURN QUERY SELECT
      false::boolean,
      0::bigint,
      COALESCE(v_limit, 0)::bigint,
      COALESCE(v_plan, 'free')::text,
      'Funcionalidade não disponível no seu plano. Faça upgrade.'::text;
    RETURN;
  END IF;

  -- 4. If no limit defined, allow unlimited (no need for bonus)
  IF v_limit IS NULL THEN
    INSERT INTO strategic_usage_logs (user_id, endpoint, tokens_used)
    VALUES (_user_id, _endpoint, 1);

    RETURN QUERY SELECT
      true::boolean,
      0::bigint,
      0::bigint,
      COALESCE(v_plan, 'free')::text,
      'OK'::text;
    RETURN;
  END IF;

  -- 5. Get bonus credits for this feature
  SELECT COALESCE(credits, 0) INTO v_bonus
  FROM user_bonus_credits
  WHERE user_id = _user_id AND feature = _feature;

  IF v_bonus IS NULL THEN
    v_bonus := 0;
  END IF;

  -- Effective limit = plan limit + bonus
  v_effective_limit := v_limit + v_bonus;

  -- 6. Count usage: FREE = lifetime (all-time), BASIC/PRO = monthly
  IF COALESCE(v_plan, 'free') = 'free' THEN
    SELECT count(*)
    INTO v_count
    FROM strategic_usage_logs
    WHERE user_id = _user_id
      AND endpoint = _endpoint;
  ELSE
    v_start_of_month := date_trunc('month', now());
    SELECT count(*)
    INTO v_count
    FROM strategic_usage_logs
    WHERE user_id = _user_id
      AND endpoint = _endpoint
      AND created_at >= v_start_of_month;
  END IF;

  -- 7. Check effective limit
  IF v_count >= v_effective_limit THEN
    RETURN QUERY SELECT
      false::boolean,
      v_count::bigint,
      v_effective_limit::bigint,
      COALESCE(v_plan, 'free')::text,
      CASE
        WHEN COALESCE(v_plan, 'free') = 'free' THEN
          'Você já usou sua análise gratuita. Faça upgrade para o plano Básico ou Pro para continuar.'
        ELSE
          format('Você atingiu o limite de %s uso(s) este mês. Suas análises serão renovadas no próximo mês.', v_effective_limit)
      END::text;
    RETURN;
  END IF;

  -- 8. Increment
  INSERT INTO strategic_usage_logs (user_id, endpoint, tokens_used)
  VALUES (_user_id, _endpoint, 1);

  RETURN QUERY SELECT
    true::boolean,
    (v_count + 1)::bigint,
    v_effective_limit::bigint,
    COALESCE(v_plan, 'free')::text,
    'OK'::text;
END;
$function$;
