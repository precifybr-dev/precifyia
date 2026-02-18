
# Corrigir Exclusao — Todos os Itens Devem Ir para a Lixeira

## Problema

Atualmente, apenas os **insumos** usam o `softDelete` (lixeira). Todos os outros itens sao deletados permanentemente com `supabase.from("tabela").delete()`, sem passar pela lixeira. Isso significa que despesas fixas, custos fixos, custos variaveis, despesas variaveis, fichas tecnicas, sub-receitas e bebidas sao perdidos permanentemente ao serem excluidos.

## Itens Afetados

| Componente | Tabela | Status Atual |
|---|---|---|
| `DeleteIngredientDialog.tsx` | `ingredients` | Usa softDelete (OK) |
| `FixedExpensesBlock.tsx` | `fixed_expenses` | Delete direto (CORRIGIR) |
| `VariableExpensesBlock.tsx` | `variable_expenses` | Delete direto (CORRIGIR) |
| `FixedCostsBlock.tsx` | `fixed_costs` | Delete direto (CORRIGIR) |
| `VariableCostsBlock.tsx` | `variable_costs` | Delete direto (CORRIGIR) |
| `Recipes.tsx` | `recipes` | Delete direto (CORRIGIR) |
| `SubRecipes.tsx` | `sub_recipes` | Delete direto (CORRIGIR) |
| `Beverages.tsx` | `beverages` | Delete direto (CORRIGIR) |

## Solucao

Substituir todas as chamadas diretas de `.delete()` pelo `softDelete` do hook `useDataProtection` em cada componente. O fluxo sera:

1. O usuario clica em excluir
2. O sistema busca os dados completos do registro
3. Chama `softDelete({ table, id, data, storeId })` que:
   - Copia os dados para `deleted_records` (lixeira)
   - Deleta o registro original
   - Exibe toast "Item movido para lixeira"
4. O item aparece na pagina Lixeira por 30 dias e pode ser restaurado

### Mudancas por Arquivo

**1. `src/components/business/FixedExpensesBlock.tsx`**
- Importar `useDataProtection`
- No `handleDelete`: buscar dados do registro, chamar `softDelete({ table: "fixed_expenses", id, data, storeId })`

**2. `src/components/business/VariableExpensesBlock.tsx`**
- Importar `useDataProtection`
- No `handleDelete`: buscar dados do registro, chamar `softDelete({ table: "variable_expenses", id, data, storeId })`

**3. `src/components/business/FixedCostsBlock.tsx`**
- Importar `useDataProtection`
- No `handleDelete`: buscar dados do registro, chamar `softDelete({ table: "fixed_costs", id, data, storeId })`

**4. `src/components/business/VariableCostsBlock.tsx`**
- Importar `useDataProtection`
- No `handleDelete`: buscar dados do registro, chamar `softDelete({ table: "variable_costs", id, data, storeId })`

**5. `src/pages/Recipes.tsx`**
- Importar `useDataProtection`
- No `handleConfirmDelete`: buscar dados completos da receita, chamar `softDelete({ table: "recipes", id, data, storeId })`

**6. `src/pages/SubRecipes.tsx`**
- Importar `useDataProtection`
- No `handleConfirmDelete`: softDelete da sub-receita e do insumo vinculado (ambos vao para a lixeira)

**7. `src/pages/Beverages.tsx`**
- Importar `useDataProtection`
- No `handleConfirmDelete`: buscar dados da bebida, chamar `softDelete({ table: "beverages", id, data, storeId })`

### Padrao de Implementacao

Cada `handleDelete` seguira este padrao:

```text
1. Buscar dados completos do registro via supabase.from(tabela).select("*").eq("id", id).single()
2. Se encontrou dados:
   - Chamar softDelete({ table: "tabela", id, data, storeId })
   - Se sucesso: atualizar lista local (fetchExpenses, fetchRecipes, etc.)
3. Se erro: exibir toast de erro
```

Nao ha necessidade de mudancas no banco de dados — a tabela `deleted_records` ja existe e suporta todas as tabelas listadas no tipo `ProtectedTable`.

### Resultado

- Todos os 8 tipos de itens irao para a lixeira ao serem excluidos
- Todos poderao ser restaurados em ate 30 dias
- A pagina Lixeira mostrara todos os itens corretamente (ja esta preparada para isso)
- O fluxo sera consistente em toda a aplicacao
