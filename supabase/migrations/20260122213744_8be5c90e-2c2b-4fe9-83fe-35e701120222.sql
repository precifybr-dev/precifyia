-- Rename profit_margin to cmv_target in recipes table
ALTER TABLE public.recipes 
RENAME COLUMN profit_margin TO cmv_target;

-- Rename default_profit_margin to default_cmv in profiles table
ALTER TABLE public.profiles 
RENAME COLUMN default_profit_margin TO default_cmv;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.recipes.cmv_target IS 'CMV desejado em percentual (ex: 30 = 30%). Preço = Custo / (CMV/100)';
COMMENT ON COLUMN public.profiles.default_cmv IS 'CMV padrão do negócio em percentual';