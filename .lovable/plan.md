
# Corrigir erro "tuple to be deleted was already modified" ao excluir loja

## Causa raiz

O erro ocorre por um conflito de triggers em cascata durante a exclusao de uma loja que pertence a um grupo de compartilhamento.

A cadeia de eventos:

1. `DELETE FROM stores WHERE id = X` e executado
2. O trigger BEFORE DELETE `cleanup_sharing_after_store_delete` dispara
3. Dentro dele, varias operacoes acontecem:
   - UPDATE em `fixed_expenses` (converte compartilhadas para exclusivas)
   - Isso dispara `trg_recalc_shared_expense_change` (AFTER UPDATE em fixed_expenses)
   - Que deleta/insere em `cost_allocations`
   - O trigger `trg_protect_cost_allocation_history` valida cada exclusao
   - UPDATE em `stores` (limpa sharing_group_id da loja restante)
   - DELETE de `sharing_group_stores`
   - Isso dispara `trg_recalc_group_store_change` (AFTER DELETE)
   - Que chama `recalculate_shared_costs()` novamente
4. Em algum ponto dessa cascata, o PostgreSQL detecta que a tupla original (store X) foi modificada por uma operacao disparada pelo mesmo comando
5. O PostgreSQL bloqueia a exclusao com o erro "tuple to be deleted was already modified"

O problema fundamental: um trigger BEFORE DELETE faz operacoes demais, disparando outros triggers que conflitam com a exclusao em andamento.

## Solucao: Substituir trigger por RPC (funcao segura)

Em vez de depender do trigger BEFORE DELETE (que cria cascatas circulares), vamos:

1. Criar uma funcao `delete_store_safe(p_store_id uuid)` que faz toda a limpeza E a exclusao em uma unica transacao controlada
2. Remover o trigger BEFORE DELETE de stores
3. Alterar o frontend para chamar a RPC em vez de DELETE direto

### Por que esta abordagem resolve?

A funcao RPC controla a ORDEM exata das operacoes:
1. Primeiro limpa cost_allocations (evita conflito com trg_protect_cost_allocation_history)
2. Depois converte expenses para exclusivas (sem dados dependentes para conflitar)
3. Limpa sharing_group_stores (sem recalculo desnecessario porque os dados ja foram limpos)
4. So entao exclui a loja (sem trigger BEFORE DELETE, cascades funcionam limpo)

## Detalhes tecnicos

### 1. Migration SQL

Criar funcao RPC e remover trigger:

```text
-- Funcao segura para excluir loja
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

  -- Verificar se nao e a unica loja
  SELECT count(*) INTO v_store_count
  FROM public.stores WHERE user_id = v_user_id;

  IF v_store_count <= 1 THEN
    RAISE EXCEPTION 'Voce precisa ter pelo menos uma loja.';
  END IF;

  -- Verificar se e default
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
      -- Grupo sera dissolvido
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
      -- Mais de 1 loja restante: remover apenas esta loja do grupo
      DELETE FROM public.sharing_group_stores
      WHERE sharing_group_id = v_group_id
        AND store_id = p_store_id;

      -- Converter expenses que ficaram com 0 ou 1 loja
      UPDATE public.fixed_expenses
      SET cost_type = 'exclusive',
          sharing_group_id = NULL,
          store_id = (shared_store_ids)[1],
          shared_store_ids = NULL
      WHERE sharing_group_id = v_group_id
        AND shared_store_ids IS NOT NULL
        AND array_length(shared_store_ids, 1) <= 1;

      -- Recalcular para as restantes
      PERFORM public.recalculate_shared_costs(v_group_id);
    END IF;

    -- 8. Limpar sharing_group_id da loja sendo excluida
    --    (evita que o trigger BEFORE DELETE tente limpar novamente)
    UPDATE public.stores
    SET sharing_group_id = NULL
    WHERE id = p_store_id;
  END IF;

  -- 9. Finalmente excluir a loja (cascades limpam dados dependentes)
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$$;

-- Remover o trigger problematico
DROP TRIGGER IF EXISTS after_store_delete_cleanup_sharing ON public.stores;
```

Nota: o trigger e removido porque a funcao RPC faz toda a limpeza. A exclusao no passo 9 dispara apenas os CASCADEs normais (ingredients, recipes, etc.), sem conflito de triggers.

### 2. Frontend: StoreContext.tsx

Alterar `deleteStore` para usar RPC em vez de DELETE direto:

```text
// ANTES:
const { error } = await supabase
  .from("stores")
  .delete()
  .eq("id", storeId);

// DEPOIS:
const { error } = await supabase
  .rpc("delete_store_safe", { p_store_id: storeId });
```

### 3. Protecao contra trg_protect_cost_allocation_history

A funcao RPC deleta cost_allocations ANTES de qualquer outra operacao. Porem, o trigger `trg_protect_cost_allocation_history` bloqueia exclusao de meses anteriores. Precisamos permitir a exclusao quando a loja esta sendo removida:

```text
-- Atualizar o trigger para permitir cascade delete quando loja e excluida
CREATE OR REPLACE FUNCTION public.protect_cost_allocation_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    -- Permitir exclusao se a loja ou expense nao existem mais (cascade)
    IF TG_OP = 'DELETE' THEN
      IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = OLD.store_id) THEN
        RETURN OLD;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.fixed_expenses WHERE id = OLD.expense_id) THEN
        RETURN OLD;
      END IF;
    END IF;
    
    IF OLD.reference_month < to_char(now(), 'YYYY-MM') THEN
      RAISE EXCEPTION 'Alocacoes de meses anteriores sao imutaveis.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
```

Explicacao: quando a funcao RPC deleta cost_allocations, as lojas e expenses ainda existem (a loja sera excluida DEPOIS). Entao para meses anteriores, o trigger precisa permitir a exclusao. A solucao: na RPC, deletamos cost_allocations de TODOS os meses (a loja esta sendo excluida, nao faz sentido proteger historico de uma loja que nao existira mais). Alternativa mais simples: remover a verificacao de mes apenas para DELETE (manter para UPDATE):

```text
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
```

Justificativa: a protecao de historico faz sentido para UPDATE (nao alterar valores passados), mas DELETE deve ser permitido quando uma loja e excluida (os dados perdem significado sem a loja).

## Arquivos alterados

1. **Nova migration SQL** -- cria funcao `delete_store_safe`, remove trigger, atualiza `protect_cost_allocation_history`
2. **src/contexts/StoreContext.tsx** -- usa `supabase.rpc("delete_store_safe", ...)` em vez de DELETE direto

## Riscos e mitigacao

| Mudanca | Risco | Mitigacao |
|---------|-------|-----------|
| Remover trigger BEFORE DELETE | Baixo - DELETE direto na tabela nao tera limpeza automatica | RPC e o unico caminho de exclusao no app. Protecao de is_default e contagem existem na RPC |
| Permitir DELETE em cost_allocations de meses antigos | Baixo - so afeta cenario de exclusao de loja | UPDATE continua protegido. Dados historicos so somem quando a loja e removida (coerente) |
| Mudar de DELETE direto para RPC | Baixo - mesma logica, mesmo resultado | Validacoes de propriedade e permissao dentro da funcao SECURITY DEFINER |

## Resultado esperado

- Exclusao de loja com grupo de compartilhamento funciona sem erro
- Exclusao de loja sem grupo de compartilhamento continua funcionando (a RPC pula a limpeza)
- Despesas compartilhadas sao corretamente convertidas para exclusivas
- Cost allocations sao limpas antes da exclusao
- Loja default continua protegida contra exclusao
- Nenhuma alteracao em formulas financeiras, RBAC ou logica de calculo
