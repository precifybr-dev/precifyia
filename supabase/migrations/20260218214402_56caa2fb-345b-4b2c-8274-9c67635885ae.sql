
-- 1. Clean up shared_store_ids referencing non-existent stores
UPDATE public.fixed_expenses fe
SET shared_store_ids = subq.valid_ids
FROM (
  SELECT fe2.id,
    (SELECT array_agg(sid) FROM unnest(fe2.shared_store_ids) AS sid WHERE EXISTS (SELECT 1 FROM public.stores WHERE id = sid)) AS valid_ids
  FROM public.fixed_expenses fe2
  WHERE fe2.shared_store_ids IS NOT NULL
) subq
WHERE fe.id = subq.id;

-- 2. Find orphan sharing groups (0 or 1 real store remaining) and dissolve them
DO $$
DECLARE
  v_group RECORD;
  v_real_count INTEGER;
  v_remaining_store_id UUID;
BEGIN
  FOR v_group IN SELECT id FROM public.sharing_groups LOOP
    -- Count REAL stores still existing in this group
    SELECT count(*) INTO v_real_count
    FROM public.sharing_group_stores sgs
    WHERE sgs.sharing_group_id = v_group.id
      AND EXISTS (SELECT 1 FROM public.stores WHERE id = sgs.store_id);

    IF v_real_count <= 1 THEN
      -- Get remaining store if any
      SELECT sgs.store_id INTO v_remaining_store_id
      FROM public.sharing_group_stores sgs
      WHERE sgs.sharing_group_id = v_group.id
        AND EXISTS (SELECT 1 FROM public.stores WHERE id = sgs.store_id)
      LIMIT 1;

      -- Convert all shared expenses to exclusive
      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = v_remaining_store_id,
          shared_store_ids = NULL
      WHERE sharing_group_id = v_group.id;

      -- Clear sharing_group_id from remaining store
      IF v_remaining_store_id IS NOT NULL THEN
        UPDATE public.stores SET sharing_group_id = NULL WHERE id = v_remaining_store_id;
      END IF;

      -- Delete cost_allocations for this group's expenses
      DELETE FROM public.cost_allocations
      WHERE expense_id IN (SELECT id FROM public.fixed_expenses WHERE sharing_group_id = v_group.id);

      -- Delete group stores
      DELETE FROM public.sharing_group_stores WHERE sharing_group_id = v_group.id;

      -- Delete the group
      DELETE FROM public.sharing_groups WHERE id = v_group.id;
    END IF;
  END LOOP;
END $$;

-- 3. Recreate more robust trigger that validates against stores table
CREATE OR REPLACE FUNCTION public.cleanup_sharing_after_store_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_remaining_count int;
  v_remaining_store_id uuid;
BEGIN
  -- Skip if store had no group
  IF OLD.sharing_group_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_group_id := OLD.sharing_group_id;

  -- Remove deleted store ID from shared_store_ids arrays
  UPDATE public.fixed_expenses
  SET shared_store_ids = array_remove(shared_store_ids, OLD.id)
  WHERE sharing_group_id = v_group_id
    AND shared_store_ids IS NOT NULL;

  -- Count REAL remaining stores (validate against stores table, excluding the one being deleted)
  SELECT count(*) INTO v_remaining_count
  FROM public.stores
  WHERE sharing_group_id = v_group_id
    AND id != OLD.id;

  IF v_remaining_count <= 1 THEN
    -- Get the remaining store
    SELECT id INTO v_remaining_store_id
    FROM public.stores
    WHERE sharing_group_id = v_group_id
      AND id != OLD.id
    LIMIT 1;

    -- Convert all shared expenses to exclusive
    UPDATE public.fixed_expenses
    SET cost_type = 'exclusive',
        sharing_group_id = NULL,
        store_id = v_remaining_store_id,
        shared_store_ids = NULL
    WHERE sharing_group_id = v_group_id;

    -- Clear sharing_group_id from remaining store
    IF v_remaining_store_id IS NOT NULL THEN
      UPDATE public.stores SET sharing_group_id = NULL WHERE id = v_remaining_store_id;
    END IF;

    -- Delete cost allocations
    DELETE FROM public.cost_allocations
    WHERE expense_id IN (SELECT id FROM public.fixed_expenses WHERE sharing_group_id = v_group_id);

    -- Delete group stores
    DELETE FROM public.sharing_group_stores WHERE sharing_group_id = v_group_id;

    -- Delete the group
    DELETE FROM public.sharing_groups WHERE id = v_group_id;
  ELSE
    -- More than 1 store remains: clean up sharing_group_stores entry and expenses with empty shared_store_ids
    DELETE FROM public.sharing_group_stores
    WHERE sharing_group_id = v_group_id AND store_id = OLD.id;

    -- Expenses with 0 or 1 stores after cleanup: convert to exclusive
    UPDATE public.fixed_expenses
    SET cost_type = 'exclusive',
        sharing_group_id = NULL,
        store_id = (shared_store_ids)[1],
        shared_store_ids = NULL
    WHERE sharing_group_id = v_group_id
      AND shared_store_ids IS NOT NULL
      AND array_length(shared_store_ids, 1) <= 1;

    -- Recalculate for remaining
    PERFORM public.recalculate_shared_costs(v_group_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS after_store_delete_cleanup_sharing ON public.stores;
CREATE TRIGGER after_store_delete_cleanup_sharing
  BEFORE DELETE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_sharing_after_store_delete();
