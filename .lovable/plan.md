
# Corrigir limpeza de despesas compartilhadas ao excluir lojas

## Problema

Quando uma loja secundaria e excluida, tres coisas nao acontecem:

1. O ID da loja excluida permanece no array `shared_store_ids` das despesas compartilhadas, fazendo a UI mostrar divisao por 3 lojas mesmo que so restem 2
2. Quando sobra apenas 1 loja (a principal), o grupo de compartilhamento nao e dissolvido -- as despesas continuam com `cost_type = "shared"` e a UI mostra o bloco de compartilhamento
3. O `sharing_group_id` da loja principal nao e limpo, entao o hook `useSharingGroup` continua ativo

## Solucao

Criar um **trigger no banco de dados** que, apos a exclusao de uma loja, automaticamente:

1. Remove o ID da loja excluida de todos os arrays `shared_store_ids` nas `fixed_expenses`
2. Verifica quantas lojas restam no grupo (`sharing_group_stores`)
3. Se restar apenas 1 loja:
   - Converte todas as despesas compartilhadas para exclusivas (da loja restante)
   - Remove o `sharing_group_id` da loja restante
   - Exclui o grupo de compartilhamento

Alem disso, atualizar o `deleteStore` no `StoreContext.tsx` para fazer `refreshStores()` apos a exclusao, garantindo que o `activeStore` reflita o estado atualizado (sem `sharing_group_id`).

## Detalhes tecnicos

### 1. Migracao SQL: trigger `after_store_delete_cleanup_sharing`

```text
CREATE OR REPLACE FUNCTION cleanup_sharing_after_store_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_remaining_count int;
  v_remaining_store_id uuid;
BEGIN
  -- Para cada grupo onde a loja excluida participava
  FOR v_group_id IN 
    SELECT DISTINCT sharing_group_id FROM fixed_expenses 
    WHERE shared_store_ids @> ARRAY[OLD.id]
  LOOP
    -- Remover o store_id do array shared_store_ids
    UPDATE fixed_expenses
    SET shared_store_ids = array_remove(shared_store_ids, OLD.id)
    WHERE sharing_group_id = v_group_id;
  END LOOP;

  -- Verificar se a loja excluida tinha um grupo
  IF OLD.sharing_group_id IS NOT NULL THEN
    -- Contar lojas restantes no grupo
    SELECT count(*) INTO v_remaining_count
    FROM sharing_group_stores
    WHERE sharing_group_id = OLD.sharing_group_id;

    IF v_remaining_count <= 1 THEN
      -- Pegar a loja restante (se houver)
      SELECT store_id INTO v_remaining_store_id
      FROM sharing_group_stores
      WHERE sharing_group_id = OLD.sharing_group_id
      LIMIT 1;

      -- Converter todas as shared expenses para exclusive
      UPDATE fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = v_remaining_store_id,
          shared_store_ids = NULL
      WHERE sharing_group_id = OLD.sharing_group_id;

      -- Limpar sharing_group_id da loja restante
      IF v_remaining_store_id IS NOT NULL THEN
        UPDATE stores
        SET sharing_group_id = NULL
        WHERE id = v_remaining_store_id;
      END IF;

      -- Deletar o grupo (cascade deleta sharing_group_stores e cost_allocations)
      DELETE FROM sharing_groups WHERE id = OLD.sharing_group_id;
    ELSE
      -- Mais de 1 loja resta: recalcular
      -- Despesas com shared_store_ids vazio ou com 1 loja: converter para exclusive
      UPDATE fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = (shared_store_ids)[1],
          shared_store_ids = NULL
      WHERE sharing_group_id = OLD.sharing_group_id
        AND (shared_store_ids IS NULL OR array_length(shared_store_ids, 1) <= 1);
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_store_delete_cleanup_sharing
  AFTER DELETE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_sharing_after_store_delete();
```

### 2. Arquivo: `src/contexts/StoreContext.tsx`

Na funcao `deleteStore`, apos a exclusao bem-sucedida, chamar `refreshStores()` para que o `activeStore` seja recarregado do banco sem `sharing_group_id`:

```text
// Apos setStores e setActiveStore:
await refreshStores();
```

### 3. Arquivo: `src/components/business/FixedExpensesBlock.tsx`

Adicionar um guard extra: se `storeCount <= 1`, nao mostrar o banner de grupo nem o toggle de compartilhamento. Isso garante proteção dupla (banco + UI).

## Resultado esperado

- Excluir 1 loja de 3: `shared_store_ids` e atualizado para 2 lojas, divisao recalculada
- Excluir 2 lojas (sobra so a principal): grupo e dissolvido, todas as despesas voltam a ser exclusivas da loja principal, UI de compartilhamento desaparece
- Criar nova loja em modo Dark Kitchen: reativa o sistema normalmente
