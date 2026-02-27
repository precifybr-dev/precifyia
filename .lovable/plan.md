

# Corrigir Numeracao de Insumos por Loja

## Problema

Quando o usuario cria uma segunda loja, a numeracao dos insumos continua de onde parou na loja 1 (ex: loja 1 tem 50 insumos, loja 2 comeca no 51). O correto e cada loja ter sua propria sequencia independente comecando pelo 1.

## Causa raiz

1. A constraint do banco e `UNIQUE (user_id, code)` — impede codigos iguais entre lojas do mesmo usuario
2. Todas as funcoes `getNextCode` buscam o maior codigo global do usuario, sem filtrar por loja

## O que sera feito

### 1. Migration SQL: alterar constraint de unicidade

Trocar a constraint de `UNIQUE (user_id, code)` para `UNIQUE (user_id, store_id, code)` na tabela `ingredients`.

Fazer o mesmo para `beverages`: trocar `UNIQUE (user_id, code)` para `UNIQUE (user_id, store_id, code)`.

Isso permite que cada loja tenha sua propria sequencia de codigos (1, 2, 3...) independente.

### 2. Corrigir `Ingredients.tsx` — getNextCode

A funcao `getNextCode` passara a considerar apenas os ingredientes carregados da loja ativa (que ja sao filtrados por store_id no `fetchIngredients`). Nenhuma mudanca de logica necessaria aqui, pois o array `ingredients` ja e filtrado por loja. O calculo `Math.max(...ingredients.map(ing => ing.code))` ja retorna o maximo correto da loja ativa.

### 3. Corrigir `Ingredients.tsx` — handleIfoodImport (getGlobalMaxCode)

A funcao `getGlobalMaxCode` sera renomeada e filtrada por `store_id` da loja ativa, em vez de buscar globalmente por `user_id`.

### 4. Corrigir `SpreadsheetImportModal.tsx`

A query que busca o maior codigo tambem sera filtrada por `store_id`.

### 5. Corrigir `Beverages.tsx` — getNextCode

Filtrar por `store_id` da loja ativa ao buscar o maior codigo.

### 6. Corrigir `IngredientsStep.tsx` (onboarding) — getNextCode

Filtrar por `store_id` da loja ao buscar o proximo codigo.

### 7. Corrigir `CopyRecipesFromStoreModal.tsx`

Ao copiar ingredientes para a loja destino, gerar o codigo sequencial correto para a loja destino (buscar max code da loja destino e incrementar).

## Detalhes tecnicos

### Migration SQL

```sql
-- Ingredients: trocar constraint
ALTER TABLE public.ingredients 
  DROP CONSTRAINT ingredients_user_id_code_key;
ALTER TABLE public.ingredients 
  ADD CONSTRAINT ingredients_user_store_code_key UNIQUE (user_id, store_id, code);

-- Beverages: trocar constraint
ALTER TABLE public.beverages 
  DROP CONSTRAINT beverages_user_code_unique;
ALTER TABLE public.beverages 
  ADD CONSTRAINT beverages_user_store_code_unique UNIQUE (user_id, store_id, code);
```

### Padrao das queries corrigidas

Antes (global):
```typescript
.eq("user_id", user.id)
.order("code", { ascending: false })
.limit(1)
```

Depois (por loja):
```typescript
.eq("user_id", user.id)
.eq("store_id", activeStoreId)
.order("code", { ascending: false })
.limit(1)
```

### Arquivos modificados

1. **Nova migration SQL** — alterar constraints de unicidade
2. **`src/pages/Ingredients.tsx`** — corrigir `getGlobalMaxCode` no iFood import
3. **`src/pages/Beverages.tsx`** — corrigir `getNextCode` para filtrar por loja
4. **`src/components/spreadsheet-import/SpreadsheetImportModal.tsx`** — filtrar por store_id
5. **`src/components/onboarding/IngredientsStep.tsx`** — corrigir `getNextCode` para filtrar por loja
6. **`src/components/recipes/CopyRecipesFromStoreModal.tsx`** — gerar codigo sequencial ao copiar ingredientes
