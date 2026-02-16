

# Blindagem Anti-Bloqueio do iFood Marketplace API

## Contexto

A Edge Function `parse-ifood-menu` ja funciona com extracao direta (custo zero), mas nao possui protecoes contra bloqueio por comportamento automatizado. O risco real e frequencia alta, burst simultaneo e falta de cache server-side inteligente.

## O Que Ja Existe

- Cache no banco (`menu_cache` / `menu_cached_at` na tabela `stores`) -- mas sem TTL enforcement no backend
- Rate limit por usuario/IP (5 req/min, 10 req/min) -- protege contra abuso, mas nao contra burst real na API do iFood
- Headers basicos no fetch -- ja tem User-Agent, Accept, Accept-Language

## O Que Precisa Mudar

### 1. Cache Server-Side com TTL (6h) -- Impacto: -90% chamadas

**Arquivo:** `supabase/functions/parse-ifood-menu/index.ts`

No bloco `full_menu` (linha ~511), ANTES de chamar `fetchFromMarketplaceAPI`:
- Verificar se `menu_cached_at` existe e e menor que 6 horas atras
- Se cache valido: retornar direto sem tocar na API do iFood
- Se `forceRefresh` vier no body: ignorar cache (para o botao "Atualizar")
- Se API falhar: retornar cache antigo mesmo expirado (stale fallback)

```text
Fluxo:
  Request chega
       |
  forceRefresh? --sim--> pula cache
       |no
  cache < 6h? --sim--> retorna cache direto
       |no
  chama API iFood
       |
  sucesso? --sim--> salva cache + retorna
       |no
  tem cache antigo? --sim--> retorna stale
       |no
  erro 422
```

### 2. Deduplicacao por merchantId (anti-burst) -- Impacto: elimina requests duplicados

**Arquivo:** `supabase/functions/parse-ifood-menu/index.ts`

Usar um Map em memoria (`pendingRequests`) para deduplicar chamadas simultaneas ao mesmo merchant:
- Se ja existe um fetch em andamento para o mesmo merchantId, aguardar o resultado dele
- Isso evita que 5 usuarios clicando ao mesmo tempo gerem 5 requests reais

### 3. Jitter de Timing (anti-padrao robotico)

**Arquivo:** `supabase/functions/parse-ifood-menu/index.ts`

Na funcao `fetchFromMarketplaceAPI`, entre cada tentativa de endpoint:
- Adicionar `await sleep(200 + Math.random() * 300)` (200-500ms aleatorios)
- Quebra padrao matematico detectavel

### 4. Headers Mais Realistas

**Arquivo:** `supabase/functions/parse-ifood-menu/index.ts`

Rotacionar User-Agents entre 3-4 opcoes reais (Chrome, Firefox, Safari) para nao repetir sempre o mesmo. Adicionar `Connection: keep-alive` e `DNT: 1`.

### 5. Stale Fallback (resiliencia)

**Arquivo:** `supabase/functions/parse-ifood-menu/index.ts`

Se TODAS as strategies falharem (bloco linha ~628):
- Antes de retornar erro 422, verificar se existe `menu_cache` antigo no banco
- Se existir, retornar com flag `stale: true` para o frontend saber que e cache antigo

### 6. Frontend: Respeitar Cache TTL + Indicador Stale

**Arquivo:** `src/hooks/useMenuMirror.ts`

- No `fetchMenu`, passar `forceRefresh` no body quando o usuario clica "Atualizar"
- Tratar resposta com `stale: true` mostrando toast informativo

**Arquivo:** `src/pages/MenuMirror.tsx`

- Nenhuma mudanca necessaria (ja passa `forceRefresh` corretamente)

## Secao Tecnica

### Mudancas no Edge Function (`parse-ifood-menu/index.ts`)

**Constantes novas:**
```
CACHE_TTL_MS = 6 * 60 * 60 * 1000 (6 horas)
USER_AGENTS = array com 4 User-Agents reais
pendingRequests = new Map() para deduplicacao
```

**Funcao sleep:**
```
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
```

**Bloco full_menu (linha ~511-684) -- reestruturacao:**
1. Ler `forceRefresh` do body
2. Se nao forceRefresh: consultar `menu_cached_at` da store
3. Se cache valido (< 6h): retornar `menu_cache` direto
4. Se forceRefresh ou cache expirado: seguir fluxo atual
5. Wrap do fluxo de fetch em try/catch com stale fallback
6. Entre endpoints no `fetchFromMarketplaceAPI`: adicionar jitter

**fetchFromMarketplaceAPI -- ajustes:**
- Rotacao de User-Agent (random do array)
- Jitter entre tentativas (200-500ms)
- Headers extras (Connection, DNT)

### Mudancas no Hook (`useMenuMirror.ts`)

- `fetchMenu` ja recebe `forceRefresh` e ja passa para o Edge Function
- Adicionar tratamento de `data.stale === true` com toast informativo

## Resultado Final

- 90%+ reducao de chamadas reais a API do iFood
- Zero burst (deduplicacao em memoria)
- Padrao nao-robotico (jitter + rotacao de UA)
- Resiliencia total (stale fallback)
- Custo continua $0.00
- Sem IA em nenhum cenario do full_menu

## Arquivos Modificados

1. `supabase/functions/parse-ifood-menu/index.ts` -- cache TTL, deduplicacao, jitter, headers, stale fallback
2. `src/hooks/useMenuMirror.ts` -- tratamento de resposta stale

