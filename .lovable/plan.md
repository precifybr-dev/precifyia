
# Fix: Custo da Embalagem no Calculo Final da Ficha Tecnica

## Problema

O custo da embalagem nao esta aparecendo na precificacao porque:

1. O backend (edge function) calcula tudo sem saber da embalagem
2. O resultado do backend (`pricingResult`) sobrescreve os valores locais que incluem embalagem
3. Mudar a embalagem nao re-dispara o calculo (falta nas dependencias do useEffect)

## Solucao

Adicionar o custo da embalagem como parametro extra enviado ao backend, para que TODOS os calculos (preco sugerido, CMV, margens, lucro liquido) incluam a embalagem.

## Mudancas

### 1. Hook `useRecipePricing.ts` - Adicionar campo `packaging_cost`

- Adicionar `packaging_cost?: number` na interface `RecipePricingInput`
- O valor sera enviado ao backend junto com os demais parametros

### 2. Edge Function `calculate-recipe-pricing` - Somar embalagem ao custo

- Receber `packaging_cost` (default 0) no body
- Somar ao `ingredients_cost_total` e `ingredients_cost_per_serving`
- Todos os calculos derivados (CMV, margem, preco sugerido, lucro) automaticamente incluirao a embalagem

### 3. `Recipes.tsx` - Passar packaging_cost e corrigir dependencias

- No `calculatePricing()`, passar `packaging_cost: packagingCost`
- Adicionar `includePackaging` e `selectedPackagingId` no array de dependencias do useEffect
- Remover a soma local duplicada (linha 780) ja que o backend fara isso

### 4. `PricingSummaryPanel` e `PricingInputsCard` - Exibir custo com embalagem

- Adicionar linha "Custo c/ Embalagem" no card de custos quando houver embalagem selecionada
- Mostrar claramente que o custo total inclui embalagem

## Arquivos modificados

- `src/hooks/useRecipePricing.ts` - adicionar campo packaging_cost na interface
- `supabase/functions/calculate-recipe-pricing/index.ts` - somar packaging_cost nos calculos
- `src/pages/Recipes.tsx` - passar packaging_cost, corrigir dependencias do useEffect
- `src/components/recipes/pricing/PricingInputsCard.tsx` - exibir linha de custo embalagem
- `src/components/recipes/PricingSummaryPanel.tsx` - passar packagingCost ao card

## O que NAO muda

- Tabelas do banco de dados
- Menu de Embalagens
- Hook `usePackagings.ts`
- UI do Switch/Select de embalagem (ja funciona)
