-- Add monthly revenue column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN monthly_revenue numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.monthly_revenue IS 'Faturamento mensal informado pelo usuário, usado como base para cálculo de percentuais de custos';
