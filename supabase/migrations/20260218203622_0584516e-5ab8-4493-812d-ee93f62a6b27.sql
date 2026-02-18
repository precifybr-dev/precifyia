
-- Add column to track which specific stores share each expense
ALTER TABLE public.fixed_expenses 
ADD COLUMN shared_store_ids uuid[] DEFAULT NULL;

-- Update recalculate_shared_costs to respect per-expense store selection
CREATE OR REPLACE FUNCTION public.recalculate_shared_costs(p_group_id uuid, p_ref_month text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_month text;
  v_store_count integer;
  v_division_type text;
  v_expense RECORD;
  v_selected_count integer;
BEGIN
  v_ref_month := COALESCE(p_ref_month, to_char(now(), 'YYYY-MM'));

  SELECT division_type INTO v_division_type
  FROM public.sharing_groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Default store count (all in group)
  SELECT count(*) INTO v_store_count
  FROM public.sharing_group_stores
  WHERE sharing_group_id = p_group_id;

  IF v_store_count = 0 THEN
    RETURN;
  END IF;

  -- Delete current month allocations for this group's expenses
  DELETE FROM public.cost_allocations
  WHERE reference_month = v_ref_month
    AND expense_id IN (
      SELECT id FROM public.fixed_expenses
      WHERE sharing_group_id = p_group_id AND cost_type = 'shared'
    );

  -- Recalculate per expense, respecting shared_store_ids
  FOR v_expense IN
    SELECT id, monthly_value, shared_store_ids
    FROM public.fixed_expenses
    WHERE sharing_group_id = p_group_id AND cost_type = 'shared'
  LOOP
    IF v_expense.shared_store_ids IS NOT NULL AND array_length(v_expense.shared_store_ids, 1) > 0 THEN
      -- Use only selected stores
      v_selected_count := array_length(v_expense.shared_store_ids, 1);

      INSERT INTO public.cost_allocations (expense_id, store_id, reference_month, allocated_amount, division_type, total_stores)
      SELECT
        v_expense.id,
        sgs.store_id,
        v_ref_month,
        ROUND(v_expense.monthly_value / v_selected_count, 2),
        v_division_type,
        v_selected_count
      FROM public.sharing_group_stores sgs
      WHERE sgs.sharing_group_id = p_group_id
        AND sgs.store_id = ANY(v_expense.shared_store_ids)
      ON CONFLICT (expense_id, store_id, reference_month)
      DO UPDATE SET
        allocated_amount = EXCLUDED.allocated_amount,
        division_type = EXCLUDED.division_type,
        total_stores = EXCLUDED.total_stores;
    ELSE
      -- Fallback: all stores in group
      INSERT INTO public.cost_allocations (expense_id, store_id, reference_month, allocated_amount, division_type, total_stores)
      SELECT
        v_expense.id,
        sgs.store_id,
        v_ref_month,
        ROUND(v_expense.monthly_value / v_store_count, 2),
        v_division_type,
        v_store_count
      FROM public.sharing_group_stores sgs
      WHERE sgs.sharing_group_id = p_group_id
      ON CONFLICT (expense_id, store_id, reference_month)
      DO UPDATE SET
        allocated_amount = EXCLUDED.allocated_amount,
        division_type = EXCLUDED.division_type,
        total_stores = EXCLUDED.total_stores;
    END IF;
  END LOOP;
END;
$function$;
