CREATE TYPE public.insight_categoria AS ENUM ('CMV','precificacao','cardapio','ticket_medio','operacao','logistica','cancelamentos');
CREATE TYPE public.insight_tipo_regra AS ENUM ('threshold_min','threshold_max','intervalo_recomendado','regra_operacional','boas_praticas');
CREATE TYPE public.insight_impacto AS ENUM ('baixo','medio','alto');

CREATE TABLE public.delivery_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text TEXT NOT NULL,
  categoria public.insight_categoria NOT NULL,
  tipo_regra public.insight_tipo_regra NOT NULL,
  valor_min NUMERIC,
  valor_max NUMERIC,
  descricao_regra TEXT NOT NULL,
  impacto public.insight_impacto NOT NULL DEFAULT 'medio',
  tags TEXT[] DEFAULT '{}',
  fonte TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read delivery_insights" ON public.delivery_insights FOR SELECT TO authenticated USING (true);