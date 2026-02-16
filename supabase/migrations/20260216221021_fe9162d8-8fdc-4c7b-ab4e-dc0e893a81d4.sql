
-- Tabela principal de períodos CMV
CREATE TABLE public.cmv_periodos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  modo TEXT NOT NULL DEFAULT 'simplificado' CHECK (modo IN ('simplificado', 'completo', 'avancado')),
  estoque_inicial NUMERIC DEFAULT 0,
  compras NUMERIC DEFAULT 0,
  estoque_final NUMERIC DEFAULT 0,
  ajustes NUMERIC DEFAULT 0,
  cmv_calculado NUMERIC DEFAULT 0,
  cmv_percentual NUMERIC DEFAULT 0,
  faturamento_liquido NUMERIC DEFAULT 0,
  meta_definida NUMERIC,
  meta_automatica NUMERIC,
  onboarding_concluido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id, mes, ano)
);

-- Tabela de categorias (modo avançado)
CREATE TABLE public.cmv_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.cmv_periodos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  estoque_inicial NUMERIC DEFAULT 0,
  compras NUMERIC DEFAULT 0,
  estoque_final NUMERIC DEFAULT 0,
  ajustes NUMERIC DEFAULT 0,
  cmv_categoria NUMERIC DEFAULT 0,
  cmv_percentual_categoria NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cmv_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmv_categorias ENABLE ROW LEVEL SECURITY;

-- RLS policies for cmv_periodos
CREATE POLICY "Users can view their own cmv_periodos"
  ON public.cmv_periodos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cmv_periodos"
  ON public.cmv_periodos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cmv_periodos"
  ON public.cmv_periodos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cmv_periodos"
  ON public.cmv_periodos FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for cmv_categorias (via periodo ownership)
CREATE POLICY "Users can view their own cmv_categorias"
  ON public.cmv_categorias FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cmv_periodos WHERE id = periodo_id AND user_id = auth.uid()));

CREATE POLICY "Users can create their own cmv_categorias"
  ON public.cmv_categorias FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.cmv_periodos WHERE id = periodo_id AND user_id = auth.uid()));

CREATE POLICY "Users can update their own cmv_categorias"
  ON public.cmv_categorias FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.cmv_periodos WHERE id = periodo_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete their own cmv_categorias"
  ON public.cmv_categorias FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.cmv_periodos WHERE id = periodo_id AND user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_cmv_periodos_updated_at
  BEFORE UPDATE ON public.cmv_periodos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
