
# Corrigir Erro 429 - Chamadas Excessivas ao Backend

## Problema Identificado

A pagina "Area do Negocio" tem ~6 componentes filhos que, ao carregar seus dados iniciais, chamam callbacks como `onTotalChange`, `onSharedTotalChange`, `onDataChanged`. Cada callback dispara `scheduleRecalc()`, que agenda uma chamada ao backend com debounce de 800ms. Porem, como os componentes carregam em momentos ligeiramente diferentes, cada um cria uma nova chamada, resultando em **11+ requisicoes por minuto** -- estourando o limite de 30/min do backend.

## Solucao

Separar as chamadas de **carregamento inicial** das chamadas de **atualizacao do usuario**. Os callbacks dos componentes filhos so devem disparar recalculo quando o usuario realmente editar dados, nao quando o componente carrega pela primeira vez.

### Mudancas Tecnicas

**1. `src/pages/BusinessArea.tsx`**
- Adicionar um `useRef` chamado `initialLoadDone` que comeca como `false`
- O `useEffect` de `activeStore` faz UMA unica chamada a `calculateMetrics` e marca `initialLoadDone = true`
- Modificar `scheduleRecalc` para ignorar chamadas enquanto `initialLoadDone` for `false`
- Isso elimina todas as chamadas redundantes dos componentes filhos durante o carregamento

**2. `src/hooks/useBusinessMetrics.ts`**
- Aumentar `DEBOUNCE_MS` de 2000ms para 3000ms para dar mais folga
- Manter a logica de retry com backoff ja existente

**3. Limpar bloqueios no banco**
- Executar `DELETE FROM rate_limit_entries WHERE endpoint = 'business-metrics'` para desbloquear o usuario imediatamente

### Resultado Esperado

- Ao abrir a pagina: **1 unica chamada** ao backend (em vez de 6-8)
- Ao editar dados: 1 chamada debounced a cada acao do usuario
- Nunca mais atingir o limite de 30 req/min em uso normal
