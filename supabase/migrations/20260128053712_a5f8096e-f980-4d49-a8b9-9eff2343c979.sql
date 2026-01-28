-- ============================================
-- MULTI-STORE SYSTEM FOR PRO ACCOUNTS
-- ============================================

-- Create stores table
CREATE TABLE public.stores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Users can view their own stores"
ON public.stores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stores"
ON public.stores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores"
ON public.stores FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores"
ON public.stores FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ADD OPTIONAL store_id TO EXISTING TABLES
-- ============================================

-- Add store_id to ingredients (nullable for backwards compatibility)
ALTER TABLE public.ingredients 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to recipes
ALTER TABLE public.recipes 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to sub_recipes
ALTER TABLE public.sub_recipes 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to fixed_costs
ALTER TABLE public.fixed_costs 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to variable_costs
ALTER TABLE public.variable_costs 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to fixed_expenses
ALTER TABLE public.fixed_expenses 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to variable_expenses
ALTER TABLE public.variable_expenses 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to monthly_revenues
ALTER TABLE public.monthly_revenues 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_stores_user_id ON public.stores(user_id);
CREATE INDEX idx_ingredients_store_id ON public.ingredients(store_id);
CREATE INDEX idx_recipes_store_id ON public.recipes(store_id);
CREATE INDEX idx_sub_recipes_store_id ON public.sub_recipes(store_id);
CREATE INDEX idx_fixed_costs_store_id ON public.fixed_costs(store_id);
CREATE INDEX idx_variable_costs_store_id ON public.variable_costs(store_id);
CREATE INDEX idx_fixed_expenses_store_id ON public.fixed_expenses(store_id);
CREATE INDEX idx_variable_expenses_store_id ON public.variable_expenses(store_id);
CREATE INDEX idx_monthly_revenues_store_id ON public.monthly_revenues(store_id);

-- ============================================
-- SECURITY FUNCTION FOR STORE OWNERSHIP
-- ============================================

CREATE OR REPLACE FUNCTION public.user_owns_store(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = _store_id
      AND user_id = auth.uid()
  )
$$;

-- ============================================
-- FUNCTION TO COUNT USER STORES
-- ============================================

CREATE OR REPLACE FUNCTION public.count_user_stores(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.stores
  WHERE user_id = _user_id
$$;