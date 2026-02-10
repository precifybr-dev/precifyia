
-- Feature flags per plan: single source of truth for what each plan can do
CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  usage_limit INTEGER DEFAULT NULL, -- null = unlimited when enabled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan, feature)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for UI hints), only service_role can write
CREATE POLICY "Anyone can read plan features"
  ON public.plan_features FOR SELECT
  USING (true);

-- Seed feature flags for all plans
INSERT INTO public.plan_features (plan, feature, enabled, usage_limit) VALUES
  -- FREE
  ('free', 'spreadsheet_import', false, NULL),
  ('free', 'data_export', false, NULL),
  ('free', 'advanced_pricing', false, NULL),
  ('free', 'ifood_import', true, 1),
  ('free', 'ai_analysis', true, 2),
  ('free', 'multi_store', false, NULL),
  ('free', 'sub_recipes', false, NULL),
  ('free', 'collaborators', false, NULL),
  -- BASIC
  ('basic', 'spreadsheet_import', true, 3),
  ('basic', 'data_export', true, NULL),
  ('basic', 'advanced_pricing', true, NULL),
  ('basic', 'ifood_import', true, 5),
  ('basic', 'ai_analysis', true, 10),
  ('basic', 'multi_store', false, NULL),
  ('basic', 'sub_recipes', true, NULL),
  ('basic', 'collaborators', false, NULL),
  -- PRO
  ('pro', 'spreadsheet_import', true, NULL),
  ('pro', 'data_export', true, NULL),
  ('pro', 'advanced_pricing', true, NULL),
  ('pro', 'ifood_import', true, NULL),
  ('pro', 'ai_analysis', true, 50),
  ('pro', 'multi_store', true, NULL),
  ('pro', 'sub_recipes', true, NULL),
  ('pro', 'collaborators', true, NULL);

-- Function to check if user's plan allows a feature
CREATE OR REPLACE FUNCTION public.check_plan_feature(
  _user_id UUID,
  _feature TEXT
)
RETURNS TABLE(allowed BOOLEAN, usage_limit INTEGER, current_plan TEXT, reason TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan TEXT;
  _enabled BOOLEAN;
  _limit INTEGER;
BEGIN
  -- Get user plan
  SELECT COALESCE(p.user_plan, 'free') INTO _plan
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  IF _plan IS NULL THEN
    _plan := 'free';
  END IF;

  -- Check feature flag
  SELECT pf.enabled, pf.usage_limit INTO _enabled, _limit
  FROM public.plan_features pf
  WHERE pf.plan = _plan AND pf.feature = _feature;

  IF NOT FOUND THEN
    -- Feature not registered = denied by default
    RETURN QUERY SELECT false, NULL::INTEGER, _plan, 'Funcionalidade não disponível no seu plano.'::TEXT;
    RETURN;
  END IF;

  IF NOT _enabled THEN
    RETURN QUERY SELECT false, _limit, _plan,
      CASE _plan
        WHEN 'free' THEN 'Funcionalidade disponível nos planos Básico ou Pro. Faça upgrade para desbloquear.'
        WHEN 'basic' THEN 'Funcionalidade disponível no plano Pro. Faça upgrade para desbloquear.'
        ELSE 'Funcionalidade não disponível no seu plano.'
      END;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, _limit, _plan, NULL::TEXT;
END;
$$;
