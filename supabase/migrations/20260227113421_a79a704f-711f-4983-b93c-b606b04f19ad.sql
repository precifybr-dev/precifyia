
-- Create packagings table
CREATE TABLE public.packagings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'simples' CHECK (type IN ('simples', 'combo')),
  category TEXT,
  description TEXT,
  cost_total NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create packaging_items table (for combo type)
CREATE TABLE public.packaging_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packaging_id UUID NOT NULL REFERENCES public.packagings(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add packaging_id to recipes table
ALTER TABLE public.recipes ADD COLUMN packaging_id UUID REFERENCES public.packagings(id) ON DELETE SET NULL;

-- Add market analysis columns to recipes
ALTER TABLE public.recipes ADD COLUMN market_price_min NUMERIC;
ALTER TABLE public.recipes ADD COLUMN market_price_avg NUMERIC;
ALTER TABLE public.recipes ADD COLUMN market_price_max NUMERIC;

-- RLS for packagings
ALTER TABLE public.packagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packagings" ON public.packagings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packagings" ON public.packagings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packagings" ON public.packagings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packagings" ON public.packagings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for packaging_items
ALTER TABLE public.packaging_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packaging items" ON public.packaging_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.packagings WHERE id = packaging_items.packaging_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own packaging items" ON public.packaging_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.packagings WHERE id = packaging_items.packaging_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own packaging items" ON public.packaging_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.packagings WHERE id = packaging_items.packaging_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own packaging items" ON public.packaging_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.packagings WHERE id = packaging_items.packaging_id AND user_id = auth.uid())
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_packagings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_packagings_timestamp
  BEFORE UPDATE ON public.packagings
  FOR EACH ROW EXECUTE FUNCTION public.update_packagings_updated_at();

-- Trigger to auto-calculate subtotal and update parent cost_total
CREATE OR REPLACE FUNCTION public.sync_packaging_cost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_packaging_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_packaging_id := OLD.packaging_id;
  ELSE
    NEW.subtotal := NEW.quantity * NEW.unit_cost;
    v_packaging_id := NEW.packaging_id;
  END IF;

  -- Update parent cost_total after this trigger completes
  -- Use a deferred approach: update in AFTER trigger instead
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER calc_packaging_item_subtotal
  BEFORE INSERT OR UPDATE ON public.packaging_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_packaging_cost();

-- After trigger to update parent cost_total
CREATE OR REPLACE FUNCTION public.update_packaging_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_packaging_id UUID;
  v_total NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_packaging_id := OLD.packaging_id;
  ELSE
    v_packaging_id := NEW.packaging_id;
  END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM public.packaging_items WHERE packaging_id = v_packaging_id;

  UPDATE public.packagings SET cost_total = v_total WHERE id = v_packaging_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_packaging_total_after
  AFTER INSERT OR UPDATE OR DELETE ON public.packaging_items
  FOR EACH ROW EXECUTE FUNCTION public.update_packaging_total();
