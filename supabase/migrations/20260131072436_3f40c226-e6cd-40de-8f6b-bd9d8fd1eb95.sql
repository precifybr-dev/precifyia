-- Atualiza ingredientes órfãos (sem store_id) para associá-los à loja padrão do usuário
UPDATE public.ingredients i
SET store_id = (
  SELECT s.id 
  FROM public.stores s 
  WHERE s.user_id = i.user_id 
    AND s.is_default = true 
  LIMIT 1
)
WHERE i.store_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.stores s 
    WHERE s.user_id = i.user_id 
      AND s.is_default = true
  );

-- Faz o mesmo para sub_recipes
UPDATE public.sub_recipes sr
SET store_id = (
  SELECT s.id 
  FROM public.stores s 
  WHERE s.user_id = sr.user_id 
    AND s.is_default = true 
  LIMIT 1
)
WHERE sr.store_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.stores s 
    WHERE s.user_id = sr.user_id 
      AND s.is_default = true
  );

-- Faz o mesmo para recipes
UPDATE public.recipes r
SET store_id = (
  SELECT s.id 
  FROM public.stores s 
  WHERE s.user_id = r.user_id 
    AND s.is_default = true 
  LIMIT 1
)
WHERE r.store_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.stores s 
    WHERE s.user_id = r.user_id 
      AND s.is_default = true
  );