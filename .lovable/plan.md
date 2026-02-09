

# Reverter Porcentagem iFood + Tooltip Educativo + Icone Amarelo

Todas as mudancas sao no arquivo `src/components/recipes/PricingSummaryPanel.tsx`.

## 1. Reverter porcentagem iFood (linha 643)

Desfazer a ultima alteracao, trocando `productionPercent` de volta para `ifoodProductionCostPercent`:

```
productionPercent.toFixed(1)  -->  ifoodProductionCostPercent.toFixed(1)
```

## 2. Icone de ajuda amarelo sutil (linha 295)

Alterar a cor do HelpCircle do bloco "CUSTOS DE PRODUCAO (%)":

```
text-muted-foreground  -->  text-yellow-500/70
```

## 3. Tooltip na porcentagem da Loja (linha 560)

Envolver o span da porcentagem com Tooltip explicativo:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-xs text-muted-foreground cursor-help">
        {productionPercent.toFixed(1)}%
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[280px] text-xs">
      Percentual rateado do preco para pagar os custos de producao do negocio. Este e o valor que esse item vai pagar os custos de producao.
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## 4. Tooltip na porcentagem do iFood (linha 643)

Mesmo Tooltip, agora com a porcentagem revertida:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-xs text-muted-foreground cursor-help">
        {ifoodProductionCostPercent.toFixed(1)}%
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[280px] text-xs">
      Percentual rateado do preco para pagar os custos de producao do negocio. Este e o valor que esse item vai pagar os custos de producao.
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## O que NAO muda

- Nenhum calculo matematico
- Valores em R$ permanecem identicos
- Demais blocos da ficha tecnica inalterados

## Resumo das edicoes

| Linha | Mudanca |
|-------|---------|
| 295 | HelpCircle: `text-muted-foreground` para `text-yellow-500/70` |
| 560 | Envolver porcentagem Loja com Tooltip educativo |
| 643 | Reverter para `ifoodProductionCostPercent` + envolver com Tooltip educativo |

