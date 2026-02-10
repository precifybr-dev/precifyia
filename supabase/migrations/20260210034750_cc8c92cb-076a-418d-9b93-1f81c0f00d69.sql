
-- Table for generated combos
CREATE TABLE public.combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published
  individual_total_price NUMERIC NOT NULL DEFAULT 0,
  combo_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  estimated_profit NUMERIC NOT NULL DEFAULT 0,
  margin_percent NUMERIC NOT NULL DEFAULT 0,
  strategy_explanation TEXT,
  ai_raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items within a combo
CREATE TABLE public.combo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- recipe, beverage
  item_id UUID, -- references recipes.id or beverages.id
  item_name TEXT NOT NULL,
  individual_price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  role TEXT, -- main, accompaniment, beverage, bait
  is_bait BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage tracking for AI generations
CREATE TABLE public.combo_generation_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  combo_id UUID REFERENCES public.combos(id),
  objective TEXT NOT NULL,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_generation_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for combos
CREATE POLICY "Users can view their own combos" ON public.combos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own combos" ON public.combos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own combos" ON public.combos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own combos" ON public.combos FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for combo_items (via combo ownership)
CREATE POLICY "Users can view their own combo items" ON public.combo_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.combos WHERE combos.id = combo_items.combo_id AND combos.user_id = auth.uid()));
CREATE POLICY "Users can insert their own combo items" ON public.combo_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.combos WHERE combos.id = combo_items.combo_id AND combos.user_id = auth.uid()));
CREATE POLICY "Users can delete their own combo items" ON public.combo_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.combos WHERE combos.id = combo_items.combo_id AND combos.user_id = auth.uid()));

-- RLS policies for combo_generation_usage
CREATE POLICY "Users can view their own combo usage" ON public.combo_generation_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own combo usage" ON public.combo_generation_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (master can view all)
CREATE POLICY "Master can view all combos" ON public.combos FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "Master can view all combo items" ON public.combo_items FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "Master can view all combo usage" ON public.combo_generation_usage FOR SELECT USING (public.is_master(auth.uid()));

-- Timestamp trigger for combos
CREATE TRIGGER update_combos_updated_at
  BEFORE UPDATE ON public.combos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert plan features for combos
INSERT INTO public.plan_features (plan, feature, enabled, usage_limit) VALUES
  ('free', 'combos_ai', true, 1),
  ('basic', 'combos_ai', true, 3),
  ('básico', 'combos_ai', true, 3),
  ('pro', 'combos_ai', true, 5);
