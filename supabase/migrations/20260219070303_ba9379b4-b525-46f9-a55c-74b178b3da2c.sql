
-- 1. Criar funcao RPC segura para excluir loja
CREATE OR REPLACE FUNCTION public.delete_store_safe(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
  v_remaining_count int;
  v_remaining_store_id uuid;
  v_is_default boolean;
  v_store_count int;
BEGIN
  -- Validar propriedade
  SELECT user_id, sharing_group_id, is_default
  INTO v_user_id, v_group_id, v_is_default
  FROM public.stores WHERE id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja nao encontrada.';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Sem permissao para excluir esta loja.';
  END IF;

  SELECT count(*) INTO v_store_count
  FROM public.stores WHERE user_id = v_user_id;

  IF v_store_count <= 1 THEN
    RAISE EXCEPTION 'Voce precisa ter pelo menos uma loja.';
  END IF;

  IF v_is_default THEN
    RAISE EXCEPTION 'Nao e possivel excluir a loja principal.';
  END IF;

  -- Limpeza de compartilhamento (se pertence a grupo)
  IF v_group_id IS NOT NULL THEN
    -- 1. Remover store das arrays shared_store_ids
    UPDATE public.fixed_expenses
    SET shared_store_ids = array_remove(shared_store_ids, p_store_id)
    WHERE sharing_group_id = v_group_id
      AND shared_store_ids IS NOT NULL;

    -- 2. Contar lojas restantes no grupo
    SELECT count(*) INTO v_remaining_count
    FROM public.stores
    WHERE sharing_group_id = v_group_id
      AND id != p_store_id;

    IF v_remaining_count <= 1 THEN
      SELECT id INTO v_remaining_store_id
      FROM public.stores
      WHERE sharing_group_id = v_group_id
        AND id != p_store_id
      LIMIT 1;

      -- 3. Deletar TODAS cost_allocations do grupo PRIMEIRO
      DELETE FROM public.cost_allocations
      WHERE expense_id IN (
        SELECT id FROM public.fixed_expenses
        WHERE sharing_group_id = v_group_id
      );

      -- 4. Converter expenses para exclusivas
      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = v_remaining_store_id,
          shared_store_ids = NULL
      WHERE sharing_group_id = v_group_id;

      -- 5. Limpar grupo da loja restante
      IF v_remaining_store_id IS NOT NULL THEN
        UPDATE public.stores
        SET sharing_group_id = NULL
        WHERE id = v_remaining_store_id;
      END IF;

      -- 6. Limpar sharing_group_stores
      DELETE FROM public.sharing_group_stores
      WHERE sharing_group_id = v_group_id;

      -- 7. Excluir grupo
      DELETE FROM public.sharing_groups
      WHERE id = v_group_id;

    ELSE
      DELETE FROM public.sharing_group_stores
      WHERE sharing_group_id = v_group_id
        AND store_id = p_store_id;

      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = (shared_store_ids)[1],
          shared_store_ids = NULL
      WHERE sharing_group_id = v_group_id
        AND shared_store_ids IS NOT NULL
        AND array_length(shared_store_ids, 1) <= 1;

      PERFORM public.recalculate_shared_costs(v_group_id);
    END IF;

    -- 8. Limpar sharing_group_id da loja sendo excluida
    UPDATE public.stores
    SET sharing_group_id = NULL
    WHERE id = p_store_id;
  END IF;

  -- 9. Finalmente excluir a loja
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$$;

-- 2. Remover o trigger problematico
DROP TRIGGER IF EXISTS after_store_delete_cleanup_sharing ON public.stores;
DROP TRIGGER IF EXISTS cleanup_sharing_after_store_delete ON public.stores;

-- 3. Atualizar protect_cost_allocation_history para permitir DELETE livremente
CREATE OR REPLACE FUNCTION public.protect_cost_allocation_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.reference_month < to_char(now(), 'YYYY-MM') THEN
      RAISE EXCEPTION 'Alocacoes de meses anteriores sao imutaveis e nao podem ser alteradas.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
