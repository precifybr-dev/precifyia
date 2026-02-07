
# Correção Crítica: Rateio de Custos Fixos e Variáveis por Faturamento

## Problema Identificado

Atualmente em `Recipes.tsx` (linha 235-238), os custos fixos e variáveis de produção são somados em R$ e adicionados diretamente ao custo por porção:

```
totalCostPerServing = ingredientsCostPerServing + productionCostsPerItem (em R$)
```

Isso faz com que **cada produto absorva 100% dos custos mensais do negócio**, gerando margens irreais e prejuízo nos cálculos.

## Solução

Converter os custos fixos + variáveis de produção em **percentual do faturamento mensal**, e aplicar esse percentual sobre o **preço de venda** do produto -- exatamente como já é feito com as despesas fixas/variáveis (`totalBusinessCostPercent`).

## Fórmula Correta

```text
percentualCustosProdução = (totalCustosFixos + totalCustosVariáveis) / faturamentoMensal * 100

Na ficha técnica:
valorCustosProdPorItem = preçoDeVenda * percentualCustosProdução / 100
```

## Arquivos a Modificar

### 1. `src/pages/Recipes.tsx`

**Mudança principal na função `fetchBusinessCosts`:**
- Remover o cálculo de `productionCostsPerItem` em R$ absoluto
- Criar novo estado `productionCostsPercent` (percentual do faturamento)
- Calcular: `(fixedCostsTotal + variableCostsTotal) / monthlyRevenue * 100`
- Se não houver faturamento mensal, o percentual fica `null` (igual ao `totalBusinessCostPercent`)

**Mudança no cálculo do custo:**
- Remover `productionCostsPerItem` da soma `totalCostPerServing`
- O `costWithLoss` volta a ser apenas `ingredientsCostPerServing * lossMultiplier` (sem custos de produção embutidos)
- O percentual de custos de produção será deduzido no Lucro Líquido Real, sobre o preço de venda

**Atualizar a chamada ao `PricingSummaryPanel`:**
- Substituir prop `productionCostsPerItem` por `productionCostsPercent`

### 2. `src/components/recipes/PricingSummaryPanel.tsx`

**Atualizar interface e cálculos:**
- Renomear prop `productionCostsPerItem: number` para `productionCostsPercent: number | null`
- No bloco de custos (linha 181-185), mostrar o percentual em vez de R$
- No cálculo do Lucro Líquido Real (linha 500-506):
  - Adicionar nova dedução: `valorCustosProd = effectivePrice * (productionCostsPercent / 100)`
  - Fórmula final: `netProfit = effectivePrice - costWithLoss - businessCostValue - productionCostValue - taxValue`
- Mesma lógica para o cálculo iFood (linhas 510-516)
- Adicionar nova linha visual "(-) Custos Produção" no detalhamento do Lucro Líquido

### 3. `src/pages/BusinessArea.tsx`

- Atualizar a seção que mostra "Total de Custos por Item: R$ X" (linhas 655-661)
- Agora deve mostrar o percentual, não o valor absoluto
- Atualizar o `TotalProductCostBlock` que já recebe `fixedCostsTotal` e `variableCostsTotal` -- esses valores continuam em R$ para exibição na Área do Negócio, mas o componente deve deixar claro que o rateio é por percentual

### 4. `src/pages/Beverages.tsx` (se aplicável)

- Verificar e aplicar a mesma correção caso use `productionCostsPerItem`

## Resultado Esperado

Exemplo com os números do usuário:
- Custos fixos + variáveis = R$ 1.150,00/mês
- Faturamento = R$ 30.000,00/mês
- Percentual = **3,83%**
- Produto de R$ 100,00: custo de produção rateado = **R$ 3,83**

## O Que Não Muda

- Cálculo de CMV (continua baseado no custo dos insumos + perda)
- Cálculo de impostos (continua igual)
- Cálculo de despesas do negócio (já funciona por percentual corretamente)
- Taxa iFood (continua igual)
- Área do Negócio continua exibindo os custos em R$ para cadastro

## Detalhes Técnicos

| Item | Antes (errado) | Depois (correto) |
|------|----------------|-------------------|
| `productionCostsPerItem` | R$ absoluto somado ao custo | Removido |
| Novo: `productionCostsPercent` | -- | % do faturamento |
| `costWithLoss` | insumos + custosProducao | apenas insumos + perda |
| Lucro Líquido | preço - custoComPerda - despesas - impostos | preço - custoComPerda - **custosProd%** - despesas - impostos |
