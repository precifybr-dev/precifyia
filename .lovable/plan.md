
# Plano: Adicionar Campo de Preco de Venda (Loja) na Ficha Tecnica

## Problema Identificado

O campo "Preco de Venda" (Loja) que aparece no formulario de edicao da Ficha Tecnica **nao esta sendo salvo no banco de dados**. Atualmente:

- O campo `sellingPrice` e usado apenas para calculos em tempo real
- Ao salvar, apenas o `suggested_price` (calculado) e persistido
- Ao reabrir a ficha, o campo `sellingPrice` e resetado para vazio

A tabela `recipes` nao possui uma coluna `selling_price` para armazenar o preco de venda manual da loja.

---

## Solucao Proposta

### 1. Migracao do Banco de Dados

Adicionar uma nova coluna `selling_price` na tabela `recipes`:

```sql
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT NULL;
```

### 2. Atualizar o Salvamento (`handleSaveRecipe`)

Modificar `src/pages/Recipes.tsx` para incluir o `selling_price` no objeto de dados:

```typescript
const recipeData = {
  user_id: user.id,
  name: recipeName,
  servings: parseInt(servings) || 1,
  cmv_target: parseFloat(cmvTarget) || 30,
  total_cost: parseFloat(ingredientsCost.toFixed(2)),
  cost_per_serving: parseFloat(costWithLoss.toFixed(2)),
  suggested_price: parseFloat(suggestedPrice.toFixed(2)),
  selling_price: sellingPrice.trim() !== "" ? parseFloat(sellingPrice) : null, // NOVO
  ifood_selling_price: customIfoodPrice > 0 ? customIfoodPrice : null,
};
```

### 3. Atualizar o Carregamento (`handleEditRecipe`)

Modificar para carregar o `selling_price` salvo ao editar uma ficha:

```typescript
setSellingPrice(recipe.selling_price?.toString() || "");
```

### 4. Atualizar a Tabela de Listagem

Na tabela de visualizacao, usar o `selling_price` salvo (se existir) em vez do `suggested_price` para os calculos de Preco Loja, CMV Loja e Lucro Loja:

```typescript
const lojaPrice = recipe.selling_price && recipe.selling_price > 0 
  ? recipe.selling_price 
  : recipe.suggested_price;
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Adicionar coluna `selling_price` |
| `src/pages/Recipes.tsx` | Salvar e carregar `selling_price` |

---

## Comportamento Esperado Apos Implementacao

1. Usuario abre uma Ficha Tecnica existente
2. Campo "Preco de Venda" mostra o valor salvo anteriormente
3. Usuario altera o preco e clica em "Salvar"
4. Ao voltar para a lista e reabrir a ficha, o preco permanece
5. Na tabela de listagem, os calculos de Loja usam o preco manual (se definido)
