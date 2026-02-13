
-- Table for configurable monetization fees
CREATE TABLE public.monetization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

-- Only master/admin can read/write
CREATE POLICY "Master/Admin can view monetization settings"
ON public.monetization_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Master can manage monetization settings"
ON public.monetization_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Insert default fee settings
INSERT INTO public.monetization_settings (setting_key, setting_value, description, created_by) VALUES
  ('withdrawal_fee_percent', 3.5, 'Taxa percentual sobre saques de afiliados', '00000000-0000-0000-0000-000000000000'),
  ('withdrawal_fee_fixed', 2.00, 'Taxa fixa por saque (R$)', '00000000-0000-0000-0000-000000000000'),
  ('late_cancellation_fee', 49.90, 'Taxa de cancelamento tardio (R$)', '00000000-0000-0000-0000-000000000000'),
  ('transaction_fee_percent', 2.5, 'Taxa percentual por transação processada', '00000000-0000-0000-0000-000000000000'),
  ('transaction_fee_fixed', 0.50, 'Taxa fixa por transação (R$)', '00000000-0000-0000-0000-000000000000'),
  ('premium_partner_monthly', 99.90, 'Mensalidade premium para parceiros/afiliados (R$)', '00000000-0000-0000-0000-000000000000'),
  ('minimum_net_margin_percent', 15, 'Margem líquida mínima aceitável (%)', '00000000-0000-0000-0000-000000000000');

-- Trigger for updated_at
CREATE TRIGGER update_monetization_settings_updated_at
BEFORE UPDATE ON public.monetization_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to estimate LTV based on avg ticket and avg subscription duration
CREATE OR REPLACE FUNCTION public.get_ltv_metrics()
RETURNS TABLE(
  average_ltv NUMERIC,
  average_subscription_months NUMERIC,
  total_active_subscribers BIGINT,
  ltv_by_plan JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  SELECT r.role::text INTO _role FROM public.user_roles r WHERE r.user_id = auth.uid() LIMIT 1;
  IF _role NOT IN ('master', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH plan_prices AS (
    SELECT unnest(ARRAY['free', 'basic', 'pro']) AS plan,
           unnest(ARRAY[0, 49.90, 99.90]) AS price
  ),
  active_users AS (
    SELECT p.user_id, p.user_plan, p.created_at, p.subscription_status,
           GREATEST(1, EXTRACT(EPOCH FROM (now() - p.created_at)) / (30*24*3600))::NUMERIC AS months_active
    FROM profiles p
    WHERE p.subscription_status = 'active'
  ),
  user_ltv AS (
    SELECT au.user_plan,
           au.months_active,
           COALESCE(pp.price, 0) * au.months_active AS estimated_ltv
    FROM active_users au
    LEFT JOIN plan_prices pp ON pp.plan = COALESCE(au.user_plan, 'free')
  )
  SELECT
    COALESCE(AVG(ul.estimated_ltv), 0)::NUMERIC AS average_ltv,
    COALESCE(AVG(ul.months_active), 0)::NUMERIC AS average_subscription_months,
    COUNT(*)::BIGINT AS total_active_subscribers,
    COALESCE(jsonb_agg(jsonb_build_object(
      'plan', ul.user_plan,
      'avg_ltv', ul.estimated_ltv,
      'months', ul.months_active
    )), '[]'::jsonb) AS ltv_by_plan
  FROM user_ltv ul;
END;
$$;
