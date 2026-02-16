
# Correção: Blocos "Despesas Totais" e "Custos de Produção (Rateio)" travados em carregamento

## Problema Identificado

Os blocos "Despesas Totais do Negócio" (TotalBusinessCostBlock) e "Custos de Produção - Rateio" (TotalProductCostBlock) ficam exibindo skeletons de carregamento (blocos cinzas pulsando) mesmo quando os dados já foram retornados com sucesso pelo backend.

**Causa raiz - dois problemas combinados:**

1. **Race condition no hook `useBusinessMetrics`**: A função `calculate()` é chamada múltiplas vezes em sequência (no mount da página, quando a store muda, e por cada componente filho via `onTotalChange`). Cada chamada:
   - Seta `isCalculating = true` imediatamente
   - Reinicia o timer de debounce de 500ms
   - Aborta a requisição anterior
   - Porém, quando uma requisição é abortada, o código faz `return` sem setar `isCalculating = false`, deixando o estado permanentemente travado em `true`

2. **Renderização destrutiva**: Quando `isCalculating` é `true`, os componentes `TotalBusinessCostBlock` e `TotalProductCostBlock` descartam completamente os dados existentes e mostram skeletons, mesmo que já tenham dados válidos de uma chamada anterior.

## Solução

### Arquivo 1: `src/hooks/useBusinessMetrics.ts`

Corrigir o gerenciamento do estado `isCalculating`:

- Mover o `setIsCalculating(true)` para dentro do callback do debounce (logo antes do fetch), em vez de chamá-lo imediatamente na função `calculate()`
- Isso evita que chamadas rápidas consecutivas marquem "carregando" antes de realmente iniciar uma requisição
- Garantir que o `AbortError` também seta `isCalculating = false` (remover o `return` precoce no catch)

Lógica corrigida:
```text
const calculate = useCallback((storeId) => {
  setError(null);
  if (debounceRef.current) clearTimeout(debounceRef.current);

  debounceRef.current = setTimeout(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsCalculating(true);  // Só marca "carregando" quando realmente vai buscar

    try {
      // ...fetch...
      setResult(data);
    } catch (err) {
      if (err.name === "AbortError") return; // OK: a próxima chamada vai setar isCalculating
      setError("...");
    } finally {
      setIsCalculating(false);
    }
  }, DEBOUNCE_MS);
}, []);
```

### Arquivo 2: `src/components/business/TotalBusinessCostBlock.tsx`

Alterar o comportamento de loading: em vez de mostrar skeletons completos quando `isCalculating` é `true`, mostrar os dados existentes com um indicador sutil de atualização (ex: opacidade reduzida ou um pequeno spinner no canto). Os skeletons completos só devem aparecer quando não existe nenhum dado anterior.

Lógica:
```text
// Skeletons só quando não tem dado nenhum
if (isCalculating && totalExpensesPercent === null && fixedExpensesPercent === null) {
  return <skeleton />;
}

// Se tem dados mas está recalculando, mostrar dados com opacidade reduzida
<div className={isCalculating ? 'opacity-60' : ''}>
  ...conteúdo normal...
</div>
```

### Arquivo 3: `src/components/business/TotalProductCostBlock.tsx`

Mesma lógica do arquivo 2: mostrar dados existentes com indicador sutil durante recálculo, em vez de destruir a UI com skeletons.

## Resultado Esperado

- Os blocos de despesas e custos de produção carregam os dados na primeira vez e nunca mais mostram skeletons vazios
- Durante recálculos (ao adicionar/remover itens), os dados existentes continuam visíveis com uma leve opacidade para indicar atualização
- O estado de carregamento nunca fica "travado" em true
