-- Adicionar coluna para preço de venda no iFood
ALTER TABLE public.beverages 
ADD COLUMN IF NOT EXISTS ifood_selling_price NUMERIC DEFAULT 0;