
-- Commission configuration table
CREATE TABLE public.commission_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type TEXT NOT NULL DEFAULT 'percentage' CHECK (model_type IN ('percentage', 'percentage_plus_fixed', 'tiered')),
  default_percentage NUMERIC NOT NULL DEFAULT 20,
  fixed_fee NUMERIC NOT NULL DEFAULT 0,
  minimum_commission NUMERIC NOT NULL DEFAULT 0,
  minimum_margin_percent NUMERIC NOT NULL DEFAULT 10,
  margin_action TEXT NOT NULL DEFAULT 'adjust' CHECK (margin_action IN ('block', 'adjust')),
  tier_ranges JSONB DEFAULT '[]'::jsonb,
  category_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master/admin can view commission config"
  ON public.commission_config FOR SELECT
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only master can insert commission config"
  ON public.commission_config FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only master can update commission config"
  ON public.commission_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only master can delete commission config"
  ON public.commission_config FOR DELETE
  USING (public.has_role(auth.uid(), 'master'));

-- Insert default config
INSERT INTO public.commission_config (model_type, default_percentage, fixed_fee, minimum_commission, minimum_margin_percent, margin_action, tier_ranges, created_by)
VALUES (
  'percentage',
  20,
  0,
  5.00,
  10,
  'adjust',
  '[{"min": 0, "max": 1000, "percent": 20}, {"min": 1001, "max": 5000, "percent": 15}, {"min": 5001, "max": null, "percent": 12}]'::jsonb,
  '00000000-0000-0000-0000-000000000000'
);
