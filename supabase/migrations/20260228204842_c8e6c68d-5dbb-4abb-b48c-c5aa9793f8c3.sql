
-- Tabela para logs de importação de planilha iFood
CREATE TABLE public.ifood_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  mes_referencia TEXT NOT NULL, -- formato: "2026-02"
  faturamento_bruto NUMERIC NOT NULL DEFAULT 0,
  faturamento_liquido NUMERIC NOT NULL DEFAULT 0,
  total_pedidos INTEGER NOT NULL DEFAULT 0,
  total_cupom_loja NUMERIC NOT NULL DEFAULT 0,
  total_cupom_ifood NUMERIC NOT NULL DEFAULT 0,
  total_comissao NUMERIC NOT NULL DEFAULT 0,
  total_taxa NUMERIC NOT NULL DEFAULT 0,
  total_anuncios NUMERIC NOT NULL DEFAULT 0,
  percentual_real_ifood NUMERIC NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  percentual_medio_comissao NUMERIC NOT NULL DEFAULT 0,
  percentual_medio_taxa NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ifood_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import logs"
  ON public.ifood_import_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import logs"
  ON public.ifood_import_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for checking monthly usage
CREATE INDEX idx_ifood_import_logs_user_month 
  ON public.ifood_import_logs(user_id, mes_referencia);
