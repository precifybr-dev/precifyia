
-- Strategic pricing plans configuration
CREATE TABLE public.pricing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  real_price_monthly numeric NOT NULL DEFAULT 0,
  anchored_price_monthly numeric NOT NULL DEFAULT 0,
  real_price_yearly numeric NOT NULL DEFAULT 0,
  anchored_price_yearly numeric NOT NULL DEFAULT 0,
  yearly_discount_percent numeric NOT NULL DEFAULT 20,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only master can manage pricing plans"
  ON public.pricing_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
  );

-- Anchoring configuration
CREATE TABLE public.pricing_anchoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_margin_percent numeric NOT NULL DEFAULT 60,
  target_ltv_cac_ratio numeric NOT NULL DEFAULT 4,
  min_ltv numeric NOT NULL DEFAULT 500,
  psychological_discount_min numeric NOT NULL DEFAULT 40,
  gateway_fee_percent numeric NOT NULL DEFAULT 5,
  avg_retention_months numeric NOT NULL DEFAULT 8,
  reinvestment_percent numeric NOT NULL DEFAULT 30,
  avg_cac numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.pricing_anchoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master can manage anchoring config"
  ON public.pricing_anchoring_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
  );

-- Strategic phrases for pricing page
CREATE TABLE public.pricing_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active phrases"
  ON public.pricing_phrases FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only master can manage phrases"
  ON public.pricing_phrases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
  );

-- Pricing change audit log
CREATE TABLE public.pricing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master can view pricing audit"
  ON public.pricing_audit_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
  );

-- Seed default plans
INSERT INTO public.pricing_plans (id, name, description, real_price_monthly, anchored_price_monthly, real_price_yearly, anchored_price_yearly, yearly_discount_percent, features, is_popular, sort_order)
VALUES
  ('teste', 'Teste', 'Para conhecer o sistema', 0, 0, 0, 0, 0,
   '[{"text":"Até 3 fichas técnicas","included":true},{"text":"Até 35 insumos","included":true},{"text":"Dashboard básico","included":true},{"text":"Importação de planilha","included":false},{"text":"Multi-loja","included":false},{"text":"Combos estratégicos","included":false}]',
   false, 0),
  ('essencial', 'Essencial', 'Para quem quer lucrar certo', 97, 147, 932, 1411, 20,
   '[{"text":"Até 8 fichas técnicas","included":true},{"text":"Até 100 insumos","included":true},{"text":"Dashboard completo","included":true},{"text":"Importação de planilha","included":true},{"text":"Multi-loja","included":false},{"text":"Combos estratégicos","included":false}]',
   false, 1),
  ('pro', 'Pro', 'Controle total do negócio', 147, 297, 1411, 2851, 20,
   '[{"text":"Fichas técnicas ilimitadas","included":true},{"text":"Insumos ilimitados","included":true},{"text":"Dashboard avançado + DRE","included":true},{"text":"Importação de planilha","included":true},{"text":"Multi-loja + equipe","included":true},{"text":"Combos estratégicos","included":true}]',
   true, 2);

-- Seed default anchoring config
INSERT INTO public.pricing_anchoring_config (min_margin_percent, target_ltv_cac_ratio, min_ltv, psychological_discount_min, gateway_fee_percent, avg_retention_months, reinvestment_percent, avg_cac)
VALUES (60, 4, 500, 40, 5, 8, 30, 50);

-- Seed default strategic phrases
INSERT INTO public.pricing_phrases (phrase_template, sort_order)
VALUES
  ('Menos que dois pedidos errados no iFood por mês.', 0),
  ('Menos que 1% do faturamento de um restaurante médio.', 1),
  ('Custa menos que um funcionário por 1 hora.', 2),
  ('Se aumentar sua margem em apenas 1 pedido por dia, já se paga.', 3),
  ('Você recupera o investimento com 3 pedidos bem precificados.', 4);
