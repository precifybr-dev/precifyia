-- Create recipes table for storing technical sheets
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1,
  profit_margin NUMERIC DEFAULT 30,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_serving NUMERIC NOT NULL DEFAULT 0,
  suggested_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_ingredients table for storing ingredients in each recipe
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on both tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipes table
CREATE POLICY "Users can view their own recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for recipe_ingredients table
-- Use a security definer function to check recipe ownership
CREATE OR REPLACE FUNCTION public.user_owns_recipe(_recipe_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recipes
    WHERE id = _recipe_id
      AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Users can view ingredients of their own recipes" 
ON public.recipe_ingredients 
FOR SELECT 
USING (public.user_owns_recipe(recipe_id));

CREATE POLICY "Users can insert ingredients to their own recipes" 
ON public.recipe_ingredients 
FOR INSERT 
WITH CHECK (public.user_owns_recipe(recipe_id));

CREATE POLICY "Users can update ingredients of their own recipes" 
ON public.recipe_ingredients 
FOR UPDATE 
USING (public.user_owns_recipe(recipe_id))
WITH CHECK (public.user_owns_recipe(recipe_id));

CREATE POLICY "Users can delete ingredients from their own recipes" 
ON public.recipe_ingredients 
FOR DELETE 
USING (public.user_owns_recipe(recipe_id));

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON public.recipe_ingredients(ingredient_id);