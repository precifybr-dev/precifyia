
# Corrigir Inconsistencia de Porcentagem nos Custos de Producao

## Problema

Na ficha tecnica, o bloco "Custos Producao" mostra porcentagens diferentes entre Loja e iFood, mesmo tendo o mesmo valor absoluto (R$ 7,39):

- **Loja**: mostra 20.5% (a taxa global aplicada)
- **iFood**: mostra 14.6% (o valor R$ 7,39 dividido pelo preco iFood R$ 50,65)

Isso confunde o usuario. A porcentagem exibida ao lado do valor deve ser consistente.

## Causa Raiz

No codigo (PricingSummaryPanel.tsx):

- Loja (linha 560): exibe `productionPercent` = `productionCostsPercent` (taxa global)
- iFood (linha 528): calcula `ifoodProductionCostPercent = ifoodProductionCost / ifoodPrice * 100`, que e a proporcao sobre o preco total do iFood, nao a taxa aplicada

## Solucao

Alterar a porcentagem exibida no bloco iFood para mostrar a **mesma taxa aplicada** (20.5%) em vez da proporcao sobre o preco iFood. Isso garante consistencia visual e semantica: o usuario entende que a mesma taxa de producao (20.5%) foi aplicada nos dois canais.

### Arquivo: `src/components/recipes/PricingSummaryPanel.tsx`

**Linha 643** -- Trocar `ifoodProductionCostPercent` por `productionPercent` (que ja esta definido como `productionCostsPercent || 0`):

Antes:
```
<span className="text-xs text-muted-foreground">{ifoodProductionCostPercent.toFixed(1)}%</span>
```

Depois:
```
<span className="text-xs text-muted-foreground">{productionPercent.toFixed(1)}%</span>
```

Isso faz com que ambos os canais mostrem "20.5%" ao lado do valor R$ 7,39, mantendo a consistencia.

## O que NAO muda

- Nenhum calculo matematico (o valor R$ 7,39 continua sendo calculado sobre a receita liquida)
- Nenhuma outra parte do sistema
- Apenas a porcentagem exibida no texto ao lado do valor no bloco iFood
