
-- Marketing monthly data (manual input by admin)
CREATE TABLE public.marketing_monthly_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_investment NUMERIC NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  leads_captured INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'all',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(month, year, source)
);

-- Marketing campaigns for individual tracking
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',
  campaign_external_id TEXT,
  creative_id TEXT,
  monthly_budget NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controllership config (operational costs, tax rates, etc)
CREATE TABLE public.controllership_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controllership_config ENABLE ROW LEVEL SECURITY;

-- RLS: Only master/admin can read and write
CREATE POLICY "Admin can view marketing data" ON public.marketing_monthly_data
  FOR SELECT USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert marketing data" ON public.marketing_monthly_data
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update marketing data" ON public.marketing_monthly_data
  FOR UPDATE USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete marketing data" ON public.marketing_monthly_data
  FOR DELETE USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Admin can view campaigns" ON public.marketing_campaigns
  FOR SELECT USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage campaigns" ON public.marketing_campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view config" ON public.controllership_config
  FOR SELECT USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage config" ON public.controllership_config
  FOR ALL USING (public.has_role(auth.uid(), 'master'));

-- Indexes
CREATE INDEX idx_marketing_monthly_period ON public.marketing_monthly_data (year, month);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns (status);
CREATE INDEX idx_controllership_config_key ON public.controllership_config (config_key);

-- Insert default controllership config
INSERT INTO public.controllership_config (config_key, config_value, description, updated_by) VALUES
  ('operational_cost_per_client', 5.00, 'Custo operacional mensal por cliente (R$)', '00000000-0000-0000-0000-000000000000'),
  ('payment_gateway_fee_percent', 5.00, 'Taxa média do gateway de pagamento (%)', '00000000-0000-0000-0000-000000000000'),
  ('tax_rate_percent', 6.00, 'Alíquota média de impostos sobre receita (%)', '00000000-0000-0000-0000-000000000000'),
  ('ideal_ltv_cac_ratio', 3.00, 'Razão LTV/CAC ideal mínima', '00000000-0000-0000-0000-000000000000'),
  ('cac_ltv_alert_threshold', 40.00, 'Alerta se CAC > X% do LTV', '00000000-0000-0000-0000-000000000000');

-- RPC to get controllership metrics
CREATE OR REPLACE FUNCTION public.get_controllership_metrics(p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  total_paying_clients BIGINT,
  new_clients_month BIGINT,
  cancelled_clients_month BIGINT,
  total_marketing_investment NUMERIC,
  total_leads BIGINT,
  total_impressions BIGINT,
  total_clicks BIGINT,
  mrr NUMERIC,
  arr_projected NUMERIC,
  average_ticket NUMERIC,
  cac NUMERIC,
  cpl NUMERIC,
  ctr NUMERIC,
  ltv NUMERIC,
  ltv_cac_ratio NUMERIC,
  payback_months NUMERIC,
  net_margin_per_client NUMERIC,
  churn_rate NUMERIC,
  monthly_growth_rate NUMERIC,
  net_revenue NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_gateway_fee NUMERIC;
  v_tax_rate NUMERIC;
  v_op_cost NUMERIC;
  v_total_paying BIGINT;
  v_mrr NUMERIC;
  v_avg_ticket NUMERIC;
  v_investment NUMERIC;
  v_leads BIGINT;
  v_impressions BIGINT;
  v_clicks BIGINT;
  v_new_clients BIGINT;
  v_cancelled BIGINT;
  v_prev_paying BIGINT;
  v_ltv_val NUMERIC;
  v_avg_months NUMERIC;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_month := COALESCE(p_month, EXTRACT(MONTH FROM now())::INTEGER);
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::INTEGER);

  -- Get config values
  SELECT COALESCE(config_value, 5) INTO v_gateway_fee FROM controllership_config WHERE config_key = 'payment_gateway_fee_percent';
  SELECT COALESCE(config_value, 6) INTO v_tax_rate FROM controllership_config WHERE config_key = 'tax_rate_percent';
  SELECT COALESCE(config_value, 5) INTO v_op_cost FROM controllership_config WHERE config_key = 'operational_cost_per_client';

  -- Paying clients
  SELECT COUNT(*) INTO v_total_paying FROM profiles
    WHERE subscription_status = 'active' AND user_plan IN ('basic', 'pro');

  -- MRR
  SELECT COALESCE(SUM(CASE WHEN user_plan = 'basic' THEN 49.90 WHEN user_plan = 'pro' THEN 99.90 ELSE 0 END), 0)
    INTO v_mrr FROM profiles WHERE subscription_status = 'active';

  -- Average ticket
  v_avg_ticket := CASE WHEN v_total_paying > 0 THEN v_mrr / v_total_paying ELSE 0 END;

  -- Marketing data for the month
  SELECT COALESCE(SUM(total_investment), 0), COALESCE(SUM(leads_captured), 0),
         COALESCE(SUM(impressions), 0), COALESCE(SUM(clicks), 0)
    INTO v_investment, v_leads, v_impressions, v_clicks
    FROM marketing_monthly_data WHERE month = v_month AND year = v_year;

  -- New clients this month
  SELECT COUNT(*) INTO v_new_clients FROM profiles
    WHERE EXTRACT(MONTH FROM created_at) = v_month AND EXTRACT(YEAR FROM created_at) = v_year
      AND user_plan IN ('basic', 'pro');

  -- Cancelled (simplified: active last month, not active now)
  SELECT COUNT(*) INTO v_cancelled FROM profiles
    WHERE subscription_status != 'active'
      AND EXTRACT(MONTH FROM updated_at) = v_month AND EXTRACT(YEAR FROM updated_at) = v_year;

  -- Previous month paying clients
  SELECT COUNT(*) INTO v_prev_paying FROM profiles
    WHERE created_at < make_date(v_year, v_month, 1)::timestamptz
      AND user_plan IN ('basic', 'pro');

  -- LTV calculation
  SELECT COALESCE(AVG(GREATEST(1, EXTRACT(EPOCH FROM (now() - created_at)) / (30 * 24 * 3600))), 1)
    INTO v_avg_months FROM profiles WHERE subscription_status = 'active' AND user_plan IN ('basic', 'pro');
  v_ltv_val := v_avg_ticket * v_avg_months;

  RETURN QUERY SELECT
    v_total_paying,
    v_new_clients,
    v_cancelled,
    v_investment,
    v_leads,
    v_impressions,
    v_clicks,
    v_mrr,
    v_mrr * 12,
    v_avg_ticket,
    CASE WHEN v_new_clients > 0 THEN v_investment / v_new_clients ELSE 0 END, -- CAC
    CASE WHEN v_leads > 0 THEN v_investment / v_leads ELSE 0 END, -- CPL
    CASE WHEN v_impressions > 0 THEN (v_clicks::NUMERIC / v_impressions * 100) ELSE 0 END, -- CTR
    v_ltv_val,
    CASE WHEN v_investment > 0 AND v_new_clients > 0 THEN v_ltv_val / (v_investment / v_new_clients) ELSE 0 END, -- LTV/CAC
    CASE WHEN v_avg_ticket > 0 AND v_new_clients > 0 THEN (v_investment / v_new_clients) / (v_avg_ticket * (1 - v_gateway_fee/100 - v_tax_rate/100) - v_op_cost) ELSE 0 END, -- Payback
    v_avg_ticket * (1 - v_gateway_fee/100 - v_tax_rate/100) - v_op_cost, -- Net margin per client
    CASE WHEN v_prev_paying > 0 THEN (v_cancelled::NUMERIC / v_prev_paying * 100) ELSE 0 END, -- Churn rate
    CASE WHEN v_prev_paying > 0 THEN ((v_total_paying - v_prev_paying)::NUMERIC / v_prev_paying * 100) ELSE 0 END, -- Growth rate
    v_mrr * (1 - v_gateway_fee/100 - v_tax_rate/100); -- Net revenue
END;
$$;
