

# Correcao de Bugs na Precificacao - Embalagem

## Bugs Encontrados

### Bug 1: "CUSTO RECEITA" ja inclui embalagem (PricingInputsCard)
No `PricingInputsCard.tsx` (linha 76), o campo "CUSTO RECEITA" exibe `ingredientsCost` que ja inclui a embalagem (calculado em `Recipes.tsx` linha 783: `rawIngredientsCost + packagingCost`). 
Resultado: as colunas "CUSTO RECEITA" e "C/ EMBALAGEM" mostram o **mesmo valor**, o que e incorreto e confuso.

**Correcao**: Passar `rawIngredientsCost` (sem embalagem) para exibir em "CUSTO RECEITA", e `ingredientsCost` (com embalagem) para "C/ EMBALAGEM".

### Bug 2: Tooltip do iFood nao menciona embalagem (PricingProfitCard)
No card de lucro do iFood (linha 312-315), o tooltip "Como o lucro e calculado" nao lista "Custo da embalagem" como item, diferente do tooltip da Loja (linha 173) que menciona corretamente.

**Correcao**: Adicionar "Custo da embalagem (quando selecionada)" na lista do tooltip do iFood.

## Arquivos a Modificar

### 1. `src/pages/Recipes.tsx`
- Passar `rawIngredientsCost` como nova prop para o `PricingSummaryPanel`

### 2. `src/components/recipes/PricingSummaryPanel.tsx`
- Receber e repassar `rawIngredientsCost` ao `PricingInputsCard`

### 3. `src/components/recipes/pricing/PricingInputsCard.tsx`
- Receber `rawIngredientsCost` como prop
- "CUSTO RECEITA" exibe `rawIngredientsCost` (somente insumos)
- "C/ EMBALAGEM" exibe `ingredientsCost` (insumos + embalagem) -- ja funciona

### 4. `src/components/recipes/pricing/PricingProfitCard.tsx`
- Adicionar "Custo da embalagem (quando selecionada)" no tooltip do iFood (linhas 312-315)

