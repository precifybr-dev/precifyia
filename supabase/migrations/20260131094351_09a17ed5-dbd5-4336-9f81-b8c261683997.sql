-- Adicionar coluna de categoria na tabela beverages
ALTER TABLE public.beverages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;