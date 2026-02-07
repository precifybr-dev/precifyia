

# Correção: Lucro Líquido na Tabela com Custos Rateados

## Problema Atual

O **Painel de Precificação** (PricingSummaryPanel) já calcula o Lucro Líquido Real corretamente, deduzindo custos de produção, despesas do negócio e impostos como percentuais do faturamento.

Porém, a **tabela de listagem** das Fichas Técnicas e das Bebidas ainda usa uma fórmula simplificada:

```text
ERRADO (tabela):
netProfitLoja = preçoVenda - custoUnitário
netProfitIfood = receitaLíquidaIfood - custoUnitário
```

Falta deduzir os custos de produção (%), despesas do negócio (%) e impostos (%) -- exatamente como o PricingSummaryPanel já faz.

## Solução

Aplicar a mesma fórmula do Lucro Líquido Real nas tabelas de listagem.

### Fórmula Correta (Loja):
```text
productionCost = preçoVenda * productionCostsPercent / 100
businessCost   = preçoVenda * totalBusinessCostPercent / 100
taxCost        = preçoVenda * taxPercentage / 100
netProfitLoja  = preçoVenda - custoUnitário - productionCost - businessCost - taxCost
```

### Fórmula Correta (iFood):
```text
ifoodFee         = preçoIfood * taxaIfood / 100
receitaLíquida   = preçoIfood - ifoodFee
productionCost   = receitaLíquida * productionCostsPercent / 100
businessCost     = receitaLíquida * totalBusinessCostPercent / 100
taxCost          = receitaLíquida * taxPercentage / 100
netProfitIfood   = receitaLíquida - custoUnitário - productionCost - businessCost - taxCost
```

## Arquivos a Modificar

### 1. `src/pages/Recipes.tsx` (tabela de listagem, linhas ~1172-1183)

Atualizar o cálculo de `netProfitLoja` e `netProfitIfood` dentro do `.map()` da tabela para incluir as deduções de `productionCostsPercent`, `totalBusinessCostPercent` e `taxPercentage` (estados que já existem no componente).

### 2. `src/pages/Beverages.tsx` (função `calculateMetrics`, linhas ~412-448)

- Buscar do banco os mesmos dados de custos de produção, despesas do negócio e impostos (como já é feito em Recipes.tsx)
- Criar estados para `productionCostsPercent`, `totalBusinessCostPercent` e `taxPercentage`
- Atualizar `calculateMetrics` para deduzir essas porcentagens do lucro líquido

## Detalhes Técnicos

| Local | Antes | Depois |
|-------|-------|--------|
| Recipes.tsx tabela L.1174 | `netProfitLoja = lojaPrice - costPerServing` | `netProfitLoja = lojaPrice - costPerServing - (lojaPrice * prodPercent/100) - (lojaPrice * bizPercent/100) - (lojaPrice * taxPercent/100)` |
| Recipes.tsx tabela L.1182 | `netProfitIfood = ifoodNetRevenue - costPerServing` | Mesma lógica com deduções sobre `ifoodNetRevenue` |
| Beverages.tsx L.424 | `netProfitLoja = sellingPrice - unitPrice` | Mesma lógica com deduções |
| Beverages.tsx L.431 | `netProfitIfood = ifoodNetRevenue - unitPrice` | Mesma lógica com deduções |

## O Que Nao Muda

- PricingSummaryPanel (já está correto)
- Cálculos de CMV (baseados apenas no custo dos insumos)
- Preços sugeridos
- Área do Negócio
- TotalProductCostBlock

