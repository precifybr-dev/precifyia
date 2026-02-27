
-- Ingredients: trocar constraint de UNIQUE (user_id, code) para UNIQUE (user_id, store_id, code)
ALTER TABLE public.ingredients 
  DROP CONSTRAINT IF EXISTS ingredients_user_id_code_key;
ALTER TABLE public.ingredients 
  ADD CONSTRAINT ingredients_user_store_code_key UNIQUE (user_id, store_id, code);

-- Beverages: trocar constraint de UNIQUE (user_id, code) para UNIQUE (user_id, store_id, code)
ALTER TABLE public.beverages 
  DROP CONSTRAINT IF EXISTS beverages_user_code_unique;
ALTER TABLE public.beverages 
  ADD CONSTRAINT beverages_user_store_code_unique UNIQUE (user_id, store_id, code);
