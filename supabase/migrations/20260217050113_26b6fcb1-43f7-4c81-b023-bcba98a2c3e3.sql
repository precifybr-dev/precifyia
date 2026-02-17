
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS monthly_revenue numeric DEFAULT 0;

-- Copiar valor atual do profiles para a loja padrao (primeira loja do usuario)
UPDATE public.stores s
SET monthly_revenue = p.monthly_revenue
FROM public.profiles p
WHERE s.user_id = p.user_id
  AND p.monthly_revenue IS NOT NULL
  AND p.monthly_revenue > 0
  AND s.id = (
    SELECT id FROM public.stores 
    WHERE user_id = p.user_id 
    ORDER BY created_at ASC 
    LIMIT 1
  );
