
CREATE OR REPLACE FUNCTION public.cleanup_sharing_after_store_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_remaining_count int;
  v_remaining_store_id uuid;
BEGIN
  -- Remove deleted store from shared_store_ids arrays
  UPDATE public.fixed_expenses
  SET shared_store_ids = array_remove(shared_store_ids, OLD.id)
  WHERE shared_store_ids @> ARRAY[OLD.id];

  -- Check if deleted store had a sharing group
  IF OLD.sharing_group_id IS NOT NULL THEN
    -- Count remaining stores in group
    SELECT count(*) INTO v_remaining_count
    FROM public.sharing_group_stores
    WHERE sharing_group_id = OLD.sharing_group_id;

    IF v_remaining_count <= 1 THEN
      -- Get the remaining store (if any)
      SELECT store_id INTO v_remaining_store_id
      FROM public.sharing_group_stores
      WHERE sharing_group_id = OLD.sharing_group_id
      LIMIT 1;

      -- Convert all shared expenses to exclusive for the remaining store
      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = v_remaining_store_id,
          shared_store_ids = NULL
      WHERE sharing_group_id = OLD.sharing_group_id;

      -- Clear sharing_group_id from remaining store
      IF v_remaining_store_id IS NOT NULL THEN
        UPDATE public.stores
        SET sharing_group_id = NULL
        WHERE id = v_remaining_store_id;
      END IF;

      -- Delete the group (cascade deletes sharing_group_stores and cost_allocations)
      DELETE FROM public.sharing_groups WHERE id = OLD.sharing_group_id;
    ELSE
      -- More than 1 store remains: convert expenses with <=1 store in shared_store_ids to exclusive
      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = (shared_store_ids)[1],
          shared_store_ids = NULL
      WHERE sharing_group_id = OLD.sharing_group_id
        AND (shared_store_ids IS NULL OR array_length(shared_store_ids, 1) <= 1);

      -- Recalculate shared costs for remaining expenses
      PERFORM public.recalculate_shared_costs(OLD.sharing_group_id);
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER after_store_delete_cleanup_sharing
  AFTER DELETE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_sharing_after_store_delete();
