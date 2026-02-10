
-- Add calculation_version to recipes (main entity that persists calculated values)
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS calculation_version TEXT NOT NULL DEFAULT 'v1';

-- Add calculation_version and calculated_at to profiles for ifood rate tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ifood_calculation_version TEXT DEFAULT NULL;

-- Calculation history: immutable log of every financial calculation
CREATE TABLE public.calculation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) DEFAULT NULL,
  entity_type TEXT NOT NULL, -- 'recipe_pricing', 'ifood_fees', 'business_metrics'
  entity_id UUID DEFAULT NULL, -- recipe_id when applicable
  calculation_version TEXT NOT NULL,
  input_snapshot JSONB NOT NULL, -- frozen inputs used
  output_snapshot JSONB NOT NULL, -- frozen outputs produced
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calculation history"
  ON public.calculation_history FOR SELECT
  USING (user_id = auth.uid());

-- Immutability: prevent tampering with historical calculations
CREATE OR REPLACE FUNCTION public.prevent_calculation_history_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Registros de cálculo histórico são imutáveis e não podem ser alterados ou excluídos.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER immutable_calculation_history
  BEFORE UPDATE OR DELETE ON public.calculation_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_calculation_history_modification();

-- Index for fast lookups by entity
CREATE INDEX idx_calculation_history_entity
  ON public.calculation_history (entity_type, entity_id, calculated_at DESC);

CREATE INDEX idx_calculation_history_user
  ON public.calculation_history (user_id, calculated_at DESC);
