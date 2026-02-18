
# Corrigir Compartilhamento de Despesas - Loja Nao Recebe Divisao

## Problema Identificado

Ao investigar o banco de dados, encontrei que as despesas "PARCELA IFOOD" e "TESTE" tem `shared_store_ids` com apenas 2 das 3 lojas (faltando FRITTO BOX). Isso acontece porque o codigo usa `stores` do contexto React, que pode estar desatualizado no momento do compartilhamento. Alem disso, despesas antigas com `shared_store_ids = NULL` funcionam corretamente porque o banco faz fallback para todas as lojas do grupo.

## Solucao

### 1. Corrigir dados existentes no banco (Migration SQL)

Atualizar as despesas compartilhadas que tem `shared_store_ids` incompleto para incluir todas as lojas do grupo:

```text
UPDATE fixed_expenses 
SET shared_store_ids = (
  SELECT array_agg(sgs.store_id)
  FROM sharing_group_stores sgs
  WHERE sgs.sharing_group_id = fixed_expenses.sharing_group_id
)
WHERE cost_type = 'shared' 
  AND sharing_group_id IS NOT NULL;
```

Isso corrige tanto despesas com `shared_store_ids` parcial quanto as com NULL.

### 2. Buscar lojas frescas do banco ao abrir o dialog de compartilhamento

No `FixedExpensesBlock.tsx`, em vez de usar `stores.map(s => s.id)` do contexto (que pode estar desatualizado), buscar as lojas diretamente do banco de dados:

**Mudanca em `handleToggleShare`:**
- Antes de abrir o dialog, fazer um `supabase.from("stores").select("id, name").eq("user_id", userId)` para garantir a lista completa
- Usar essa lista fresca para pre-selecionar todas as lojas
- Armazenar essa lista fresca em um estado local para renderizar no dialog

### 3. Garantir que o dialog use a lista fresca

Criar um novo estado `availableStores` que e populado com dados frescos do banco cada vez que o dialog abre. O dialog usara `availableStores` em vez de `stores` do contexto para renderizar as opcoes.

### 4. Adicionar validacao pos-salvamento

Apos o `confirmShare` salvar, verificar que `shared_store_ids` foi salvo corretamente fazendo uma leitura do registro atualizado e comparando com `selectedShareStores`.

## Detalhes Tecnicos

### Arquivo: `src/components/business/FixedExpensesBlock.tsx`

1. Adicionar estado `availableStores`:
```text
const [availableStores, setAvailableStores] = useState<{id: string; name: string}[]>([]);
```

2. Modificar `handleToggleShare` para buscar lojas frescas:
```text
const handleToggleShare = async (expense) => {
  if (expense.cost_type === "exclusive") {
    // Buscar lojas frescas do banco
    const { data: freshStores } = await supabase
      .from("stores")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    
    const storesList = freshStores || [];
    setAvailableStores(storesList);
    setSelectedShareStores(storesList.map(s => s.id));
    setShareConfirmExpense(expense);
  } else {
    setUnshareConfirmExpense(expense);
  }
};
```

3. No dialog de selecao de lojas, trocar `stores.map((store) => ...)` por `availableStores.map((store) => ...)` para usar a lista fresca

4. Adicionar validacao no `confirmShare` apos salvar:
```text
// Verificar se salvou corretamente
const { data: saved } = await supabase
  .from("fixed_expenses")
  .select("shared_store_ids")
  .eq("id", shareConfirmExpense.id)
  .single();

if (saved?.shared_store_ids?.length !== selectedShareStores.length) {
  toast({ title: "Atenção", description: "Verifique se todas as lojas foram incluidas", variant: "destructive" });
}
```

### Arquivo: Migration SQL

Uma unica migration para normalizar os dados existentes, garantindo que toda despesa compartilhada tenha `shared_store_ids` completo com todas as lojas do grupo.

## Resultado Esperado

- Todas as 3 lojas aparecerao corretamente no dialog de compartilhamento
- Ao compartilhar, todas as lojas selecionadas serao salvas no banco
- Despesas existentes serao corrigidas para incluir todas as lojas
- Recalculo automatico garantira que a divisao reflita o numero correto de lojas
