
# Plano: Corrigir Exibicao do Preco de Venda Loja na Tabela

## Problema

Apesar do campo `selling_price` agora ser salvo corretamente no banco de dados, a tabela de listagem das Fichas Tecnicas **ainda usa apenas o `suggested_price`** para exibir o preco e calcular o CMV/Lucro da Loja.

O preço que o usuario define manualmente não aparece na coluna "Preço Loja" porque o código da tabela ignora o campo `selling_price`.

---

## Localizacao do Problema

Em `src/pages/Recipes.tsx`, linhas 1007-1050:

```typescript
// Atualmente (ERRADO):
const suggestedPrice = recipe.suggested_price || 0;

// Todos os calculos usam suggestedPrice:
const cmvLoja = suggestedPrice > 0 ? (costPerServing / suggestedPrice) * 100 : 0;
const netProfitLoja = suggestedPrice - costPerServing;
```

---

## Solucao

Modificar a logica da tabela para **priorizar o `selling_price` salvo** quando ele existir, usando o `suggested_price` apenas como fallback:

```typescript
// CORRIGIDO - usar selling_price se existir, senao suggested_price
const lojaPrice = recipe.selling_price && recipe.selling_price > 0 
  ? recipe.selling_price 
  : recipe.suggested_price || 0;

const isCustomLojaPrice = recipe.selling_price && recipe.selling_price > 0;

// CMV e Lucro agora usam lojaPrice
const cmvLoja = lojaPrice > 0 ? (costPerServing / lojaPrice) * 100 : 0;
const netProfitLoja = lojaPrice - costPerServing;
const netProfitPercentLoja = lojaPrice > 0 ? (netProfitLoja / lojaPrice) * 100 : 0;
```

---

## Alteracoes Visuais

Na coluna "Preco Loja", adicionar indicador visual para diferenciar preco manual vs sugerido:

```typescript
<TableCell className="text-right font-mono font-semibold text-foreground">
  {lojaPrice > 0 ? (
    <div className="flex flex-col items-end">
      <span>{formatCurrency(lojaPrice)}</span>
      {!isCustomLojaPrice && (
        <span className="text-[10px] text-muted-foreground/70">sugerido</span>
      )}
    </div>
  ) : '—'}
</TableCell>
```

Isso fica consistente com o comportamento do Preco iFood que ja mostra "sugerido" quando nao ha preco manual.

---

## Arquivo a Modificar

| Arquivo | Linhas | Alteracao |
|---------|--------|-----------|
| `src/pages/Recipes.tsx` | 1007-1055 | Usar `selling_price` nos calculos e exibicao da Loja |

---

## Resultado Esperado

1. Usuario salva ficha tecnica com preco de venda manual de R$ 15,00
2. Na tabela de listagem, coluna "Preco Loja" mostra R$ 15,00
3. CMV Loja e Lucro Loja sao calculados com base em R$ 15,00
4. Se o usuario nao definir preco manual, a tabela usa o sugerido e mostra "sugerido" abaixo do valor
