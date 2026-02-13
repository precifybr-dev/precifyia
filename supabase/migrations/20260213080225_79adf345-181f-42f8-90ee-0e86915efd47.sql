
-- Tabela de memória contextual por usuário
CREATE TABLE public.combo_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  produtos_frequentes JSONB DEFAULT '[]'::jsonb,
  estrategias_usadas JSONB DEFAULT '[]'::jsonb,
  margem_media NUMERIC DEFAULT 0,
  ultimo_objetivo TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique por usuário
CREATE UNIQUE INDEX idx_combo_memory_user ON public.combo_memory (user_id);

ALTER TABLE public.combo_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own combo memory"
  ON public.combo_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own combo memory"
  ON public.combo_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own combo memory"
  ON public.combo_memory FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabela de simulações de topo de cardápio
CREATE TABLE public.topo_cardapio_simulacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  estrategia_aplicada TEXT NOT NULL,
  itens_simulados JSONB NOT NULL DEFAULT '[]'::jsonb,
  explicacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.topo_cardapio_simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations"
  ON public.topo_cardapio_simulacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON public.topo_cardapio_simulacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON public.topo_cardapio_simulacoes FOR DELETE
  USING (auth.uid() = user_id);
