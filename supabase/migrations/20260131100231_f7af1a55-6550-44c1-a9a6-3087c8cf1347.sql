-- Adicionar coluna de preço de venda no iFood para receitas
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ifood_selling_price NUMERIC DEFAULT NULL;