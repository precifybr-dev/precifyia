

# Corrigir Modal de Copia: Sub-Receitas entre Lojas

## Resumo

O modal "Copiar de outra loja" atualmente copia **fichas tecnicas (recipes)**. O usuario quer que ele copie **sub-receitas (sub_recipes)** entre lojas, importando automaticamente os ingredientes necessarios que nao existam na loja destino, mantendo custos e configuracoes.

## O que sera feito

### 1. Renomear e adaptar o CopyRecipesFromStoreModal

Transformar o modal para copiar **sub-receitas** em vez de receitas:
- Buscar da tabela `sub_recipes` (em vez de `recipes`)
- Buscar ingredientes da tabela `sub_recipe_ingredients` (em vez de `recipe_ingredients`)
- Ao copiar, criar a sub-receita na loja destino com todos os seus ingredientes
- Criar o ingrediente vinculado automaticamente (`is_sub_recipe = true`) na loja destino
- Atualizar textos do modal para refletir "Sub-Receitas"

### 2. Logica de copia (fluxo completo)

Para cada sub-receita selecionada:

1. Buscar `sub_recipe_ingredients` da sub-receita de origem
2. Para cada ingrediente usado:
   - Verificar se ja existe na loja destino (por nome normalizado)
   - Se nao existir: criar o ingrediente na loja destino com codigo sequencial e `unit_price` recalculado
3. Criar a `sub_recipe` na loja destino com `total_cost`, `unit_cost`, `yield_quantity`, `unit`
4. Criar os `sub_recipe_ingredients` com os IDs mapeados para a loja destino
5. Criar o ingrediente vinculado (`is_sub_recipe = true`, `sub_recipe_id = novo_id`) na loja destino

### 3. Mover o botao para a pagina SubRecipes.tsx

- Adicionar o botao "Copiar de outra loja" na pagina de Sub-Receitas (`SubRecipes.tsx`)
- Manter o botao na pagina de Fichas Tecnicas (`Recipes.tsx`) tambem, caso queiram copiar fichas tecnicas
- Ambas as paginas terao a opcao de copiar da outra loja

### 4. Bidirecionalidade

- Qualquer loja pode copiar sub-receitas de qualquer outra loja do mesmo usuario
- Loja 1 pode copiar de Loja 2 ou 3, e vice-versa
- A lista de lojas de origem mostra todas as outras lojas (exceto a ativa)

## Arquivos modificados

1. **`src/components/recipes/CopyRecipesFromStoreModal.tsx`** — Adicionar prop `mode` ("recipes" | "sub-recipes") para suportar ambos os tipos. Quando `mode = "sub-recipes"`, buscar de `sub_recipes` e `sub_recipe_ingredients`, e criar o ingrediente vinculado automaticamente
2. **`src/pages/SubRecipes.tsx`** — Importar e renderizar o modal + botao "Copiar de outra loja"
3. **`src/pages/Recipes.tsx`** — Passar `mode="recipes"` ao modal existente (sem mudanca visual)

## Detalhes tecnicos

### Fluxo de copia de sub-receita

```text
Sub-receita origem (Loja A)
  |
  +-- sub_recipe_ingredients
  |     +-- ingrediente X (existe na Loja B? reutiliza : cria)
  |     +-- ingrediente Y (existe na Loja B? reutiliza : cria)
  |
  v
Sub-receita destino (Loja B)
  +-- sub_recipe_ingredients (com IDs mapeados)
  +-- ingrediente vinculado (is_sub_recipe=true)
```

### Ingrediente vinculado

Ao criar uma sub-receita, o sistema cria automaticamente um ingrediente com:
- `is_sub_recipe = true`
- `sub_recipe_id = id_da_nova_sub_receita`
- `unit_price = unit_cost` da sub-receita
- `purchase_price = total_cost`
- `purchase_quantity = yield_quantity`
