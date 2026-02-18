-- Corrigir shared_store_ids de despesas compartilhadas existentes
UPDATE public.fixed_expenses 
SET shared_store_ids = (
  SELECT array_agg(sgs.store_id)
  FROM public.sharing_group_stores sgs
  WHERE sgs.sharing_group_id = fixed_expenses.sharing_group_id
)
WHERE cost_type = 'shared' 
  AND sharing_group_id IS NOT NULL;