
CREATE TABLE public.ifood_monthly_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL, -- YYYY-MM
  valor_das_vendas NUMERIC NOT NULL DEFAULT 0,
  taxas_comissoes_total NUMERIC NOT NULL DEFAULT 0,
  servicos_promocoes_total NUMERIC NOT NULL DEFAULT 0,
  ajustes_total NUMERIC NOT NULL DEFAULT 0,
  total_faturamento NUMERIC NOT NULL DEFAULT 0,
  total_pedidos_unicos INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  cupom_loja_total NUMERIC NOT NULL DEFAULT 0,
  cupom_ifood_total NUMERIC NOT NULL DEFAULT 0,
  pedidos_com_cupom_total INTEGER NOT NULL DEFAULT 0,
  pedidos_sem_cupom_total INTEGER NOT NULL DEFAULT 0,
  pedidos_so_loja_cupom INTEGER NOT NULL DEFAULT 0,
  pedidos_so_ifood_cupom INTEGER NOT NULL DEFAULT 0,
  pedidos_ambos_cupom INTEGER NOT NULL DEFAULT 0,
  entrega_ifood_pedidos INTEGER NOT NULL DEFAULT 0,
  entrega_ifood_custo_total NUMERIC NOT NULL DEFAULT 0,
  anuncios_total NUMERIC NOT NULL DEFAULT 0,
  custo_extra_total NUMERIC NOT NULL DEFAULT 0,
  custo_extra_percentual NUMERIC NOT NULL DEFAULT 0,
  total_comissao NUMERIC NOT NULL DEFAULT 0,
  total_taxa_transacao NUMERIC NOT NULL DEFAULT 0,
  percentual_real_ifood NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id, competencia)
);

-- RLS
ALTER TABLE public.ifood_monthly_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metrics" ON public.ifood_monthly_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON public.ifood_monthly_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" ON public.ifood_monthly_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_ifood_monthly_metrics_user_comp ON public.ifood_monthly_metrics(user_id, competencia);
