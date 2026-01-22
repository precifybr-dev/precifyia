-- Add color column to ingredients table for visual categorization
ALTER TABLE public.ingredients 
ADD COLUMN color text DEFAULT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.ingredients.color IS 'Optional color hex code for visual categorization of ingredients';