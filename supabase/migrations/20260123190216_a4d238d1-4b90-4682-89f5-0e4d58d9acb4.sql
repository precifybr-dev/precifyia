-- Create sub_recipes table for intermediate preparations (bases, sauces, etc.)
CREATE TABLE public.sub_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code INTEGER NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  yield_quantity NUMERIC NOT NULL DEFAULT 1,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sub_recipe_ingredients junction table
CREATE TABLE public.sub_recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_recipe_id UUID NOT NULL REFERENCES public.sub_recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for sub_recipe codes starting at 500
CREATE SEQUENCE IF NOT EXISTS sub_recipe_code_seq START WITH 500;

-- Alter sub_recipes to use the sequence for code
ALTER TABLE public.sub_recipes ALTER COLUMN code SET DEFAULT nextval('sub_recipe_code_seq'::regclass);

-- Add is_sub_recipe flag to ingredients table to mark auto-created ingredients
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS is_sub_recipe BOOLEAN DEFAULT false;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS sub_recipe_id UUID REFERENCES public.sub_recipes(id) ON DELETE CASCADE;

-- Enable RLS on sub_recipes
ALTER TABLE public.sub_recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sub_recipes
CREATE POLICY "Users can view their own sub_recipes" 
  ON public.sub_recipes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sub_recipes" 
  ON public.sub_recipes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub_recipes" 
  ON public.sub_recipes FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub_recipes" 
  ON public.sub_recipes FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on sub_recipe_ingredients
ALTER TABLE public.sub_recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Create function to check if user owns the sub_recipe
CREATE OR REPLACE FUNCTION public.user_owns_sub_recipe(_sub_recipe_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sub_recipes
    WHERE id = _sub_recipe_id
      AND user_id = auth.uid()
  )
$$;

-- Create RLS policies for sub_recipe_ingredients
CREATE POLICY "Users can view ingredients of their own sub_recipes" 
  ON public.sub_recipe_ingredients FOR SELECT 
  USING (user_owns_sub_recipe(sub_recipe_id));

CREATE POLICY "Users can insert ingredients to their own sub_recipes" 
  ON public.sub_recipe_ingredients FOR INSERT 
  WITH CHECK (user_owns_sub_recipe(sub_recipe_id));

CREATE POLICY "Users can update ingredients of their own sub_recipes" 
  ON public.sub_recipe_ingredients FOR UPDATE 
  USING (user_owns_sub_recipe(sub_recipe_id))
  WITH CHECK (user_owns_sub_recipe(sub_recipe_id));

CREATE POLICY "Users can delete ingredients from their own sub_recipes" 
  ON public.sub_recipe_ingredients FOR DELETE 
  USING (user_owns_sub_recipe(sub_recipe_id));

-- Create trigger for updated_at
CREATE TRIGGER update_sub_recipes_updated_at
  BEFORE UPDATE ON public.sub_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();