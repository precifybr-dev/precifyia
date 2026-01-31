-- Adicionar coluna selling_price para armazenar o preço de venda manual da loja
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT NULL;