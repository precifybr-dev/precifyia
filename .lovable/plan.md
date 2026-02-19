

# Eliminar tempestade de requisicoes na Área do Negocio

## Problema raiz

A pagina BusinessArea tem **8 componentes filhos** que cada um chama `scheduleRecalc()` quando carrega seus dados. Somado a chamada direta no `useEffect` de troca de loja, isso gera dezenas de chamadas a edge function em poucos segundos, estourando o rate limit de 80 req/min.

O debounce de 800ms no `scheduleRecalc` + 3000ms no hook nao e suficiente porque os callbacks dos filhos disparam em momentos diferentes (cada um tem seu proprio fetch assincrono).

## Solucao

### 1. Consolidar todas as chamadas em um unico ponto controlado

No `BusinessArea.tsx`:

- Remover a chamada direta `calculateMetrics(activeStore?.id)` do useEffect de troca de loja (linha 233)
- Alterar `scheduleRecalc` para usar um debounce mais longo (2000ms ao inves de 800ms), dando tempo para todos os filhos carregarem
- Marcar `initialLoadDone` so apos 5 segundos (ao inves de 3), cobrindo componentes mais lentos
- Disparar `calculateMetrics` uma unica vez apos o timer de `initialLoadDone` expirar (primeiro calculo garantido)

Resultado: ao abrir a pagina, os 8 filhos carregam e disparam callbacks, mas NENHUM gera requisicao durante os primeiros 5 segundos. Depois, apenas UM calculo e feito.

### 2. Aumentar debounce no hook useBusinessMetrics

No `useBusinessMetrics.ts`:

- Aumentar `DEBOUNCE_MS` de 3000ms para 5000ms
- Isso garante que mesmo se `scheduleRecalc` for chamado multiplas vezes em sequencia, apenas a ultima chamada gera requisicao

### 3. Aumentar rate limit no backend (margem de seguranca)

No `calculate-business-metrics/index.ts`:

- Aumentar `_max_requests` de 80 para 120
- Aumentar `_window_seconds` de 60 para 120 (2 minutos)
- Manter `_block_seconds` em 10

Isso permite 120 requisicoes em 2 minutos (1 req/seg em media), muito mais tolerante sem abrir brecha para abuso.

## Detalhes tecnicos

### Arquivo: `src/pages/BusinessArea.tsx`

```text
// ANTES (linha 88-94):
const scheduleRecalc = useCallback(() => {
  if (!initialLoadDone.current) return;
  if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
  recalcTimerRef.current = setTimeout(() => {
    calculateMetrics(activeStore?.id);
  }, 800);
}, [activeStore?.id, calculateMetrics]);

// DEPOIS:
const scheduleRecalc = useCallback(() => {
  if (!initialLoadDone.current) return;
  if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
  recalcTimerRef.current = setTimeout(() => {
    calculateMetrics(activeStore?.id);
  }, 2000);
}, [activeStore?.id, calculateMetrics]);
```

```text
// ANTES (linha 216-239): useEffect troca de loja
calculateMetrics(activeStore?.id);  // REMOVER esta linha
fetchMetrics(user.id, activeStore?.id);
const timer = setTimeout(() => { initialLoadDone.current = true; }, 3000);

// DEPOIS:
fetchMetrics(user.id, activeStore?.id);
const timer = setTimeout(() => {
  initialLoadDone.current = true;
  calculateMetrics(activeStore?.id); // Unico calculo inicial, apos todos os filhos carregarem
}, 5000);
```

### Arquivo: `src/hooks/useBusinessMetrics.ts`

```text
// ANTES (linha 42):
const DEBOUNCE_MS = 3000;

// DEPOIS:
const DEBOUNCE_MS = 5000;
```

### Arquivo: `supabase/functions/calculate-business-metrics/index.ts`

```text
// ANTES:
_max_requests: 80, _window_seconds: 60, _block_seconds: 10

// DEPOIS:
_max_requests: 120, _window_seconds: 120, _block_seconds: 10
```

## Resultado esperado

- Abertura da pagina: 0 chamadas nos primeiros 5 segundos, depois exatamente 1 chamada
- Edicao de dados pelo usuario: 1 chamada apos 2s de inatividade (debounce do scheduleRecalc) + 5s de debounce do hook = maximo 1 chamada real
- Troca de loja: 1 chamada apos 5 segundos (tempo para filhos recarregarem)
- Rate limit nunca atingido em uso normal (120 req / 2 min = impossivel com debounce de 5s)
- Nenhuma alteracao na logica de calculo financeiro
