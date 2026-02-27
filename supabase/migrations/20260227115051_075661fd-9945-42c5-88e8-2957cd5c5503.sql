
ALTER TABLE public.packaging_items
ADD COLUMN ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.packaging_items.ingredient_id IS 'FK para insumo cadastrado. item_name e unit_cost sao preenchidos automaticamente do insumo.';
