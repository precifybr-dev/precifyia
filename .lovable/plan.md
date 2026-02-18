

# Corrigir DRE para carregar dados corretos por loja

## Problema encontrado

A causa raiz do DRE exibir dados da loja 1 na loja 2 esta na **edge function `calculate-business-metrics`**: ela le o `monthly_revenue` da tabela `profiles` (valor unico do usuario), e nao da tabela `stores` (que tem `monthly_revenue` por loja).

Dados no banco confirmam:
- Tabela `stores`: "Lanches Parana" tem R$15.833, outras lojas tem R$0
- Tabela `profiles`: R$15.833 (valor unico para todas as lojas)
- A edge function sempre usa o valor do `profiles`, ignorando a coluna `monthly_revenue` da loja

Alem disso, despesas legadas (sem `store_id`) nao aparecem em nenhuma loja quando filtradas por `store_id`.

## Solucao

### 1. Corrigir edge function `calculate-business-metrics`

Alterar a query de `monthly_revenue` para:
- Se `storeId` foi informado: ler `monthly_revenue` da tabela `stores`
- Senao: ler da tabela `profiles` (compatibilidade)

```text
// ANTES (errado):
supabase.from("profiles").select("monthly_revenue, cost_limit_percent").eq("user_id", user.id)

// DEPOIS (correto):
// 1. Sempre buscar cost_limit_percent do profiles
// 2. Se storeId, buscar monthly_revenue da stores
```

### 2. Melhorar o hook `useBusinessMetrics`

Remover o guard `inflightRef` que pode bloquear requisicoes legitimas apos abort, e garantir que a troca de loja cancele e substitua a requisicao anterior de forma limpa.

### 3. Deploy da edge function

Apos alterar o codigo, fazer deploy da funcao `calculate-business-metrics`.

## Detalhes tecnicos

### Arquivo: `supabase/functions/calculate-business-metrics/index.ts`

Modificar o bloco de fetch paralelo (linhas 113-129) para buscar `monthly_revenue` da tabela correta:

```text
// Buscar monthly_revenue da loja (se storeId) ou do perfil
const revenuePromise = storeId
  ? supabase.from("stores").select("monthly_revenue").eq("id", storeId).maybeSingle()
  : supabase.from("profiles").select("monthly_revenue").eq("user_id", user.id).maybeSingle();

const [
  { data: profile },
  { data: revenueSource },
  { data: fixedCosts },
  // ... demais queries
] = await Promise.all([
  supabase.from("profiles").select("cost_limit_percent").eq("user_id", user.id).maybeSingle(),
  revenuePromise,
  // ... demais queries com storeFilter
]);

const monthlyRevenue = revenueSource?.monthly_revenue ? Number(revenueSource.monthly_revenue) : null;
const costLimitPercent = profile?.cost_limit_percent ?? 40;
```

### Arquivo: `src/hooks/useBusinessMetrics.ts`

Simplificar o controle de concorrencia: remover `inflightRef` guard no inicio do setTimeout callback (que pode impedir chamadas validas apos abort), e confiar apenas no `AbortController` + `lastStoreRef` para evitar dados obsoletos.

## Resultado esperado

- Cada loja mostra seu proprio faturamento no DRE
- Lojas sem faturamento configurado mostram "---" ao inves do faturamento de outra loja
- Troca de loja e rapida (300ms debounce) e sem dados cruzados
- Sem reload de pagina necessario

