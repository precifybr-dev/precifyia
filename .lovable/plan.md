
# Corrigir vazamento de dados no Dashboard entre lojas

## Problema

O Dashboard da loja 2 e 3 mostra dados da loja 1 porque varias queries nao filtram por `storeId`:

1. **Faturamento Mensal (linha 192)**: busca de `profileData.monthly_revenue` (global) em vez de `stores.monthly_revenue` (por loja)
2. **OnboardingProgress (linhas 41-44)**: contagem de insumos nao filtra por `store_id`, mostrando "66 insumos" da loja 1 em todas as lojas
3. **Existing ingredients (linhas 116-118)**: busca para o modal de importacao tambem nao filtra por `store_id`
4. **Business name no onboarding**: usa `profile.business_name` (global) em vez de `activeStore.name`

## Solucao

### Arquivo 1: `src/pages/Dashboard.tsx`

**Linha 192** - Buscar faturamento da loja ativa:
```
// Antes:
setMonthlyRevenue(profileData?.monthly_revenue || 0);

// Depois:
if (storeId) {
  const { data: storeData } = await supabase
    .from("stores")
    .select("monthly_revenue")
    .eq("id", storeId)
    .maybeSingle();
  setMonthlyRevenue(storeData?.monthly_revenue ? Number(storeData.monthly_revenue) : 0);
} else {
  setMonthlyRevenue(profileData?.monthly_revenue || 0);
}
```

**Linhas 116-118** - Filtrar ingredients existentes por loja:
```
let ingListQuery = supabase.from("ingredients").select("name").eq("user_id", session.user.id);
if (activeStore?.id) ingListQuery = ingListQuery.eq("store_id", activeStore.id);
const { data: ingData } = await ingListQuery;
```

**Linha 581** - Passar `storeId` para OnboardingProgress:
```
<OnboardingProgress profile={profile} userId={user?.id} storeId={activeStore?.id} />
```

**Linha 83** - Usar nome da loja ativa no onboarding progress description:
Isso sera feito passando o `activeStore` para que o nome correto apareca.

### Arquivo 2: `src/components/dashboard/OnboardingProgress.tsx`

- Aceitar prop `storeId` opcional
- Filtrar contagem de insumos por `store_id` quando disponivel
- Usar o nome da loja ativa (via prop) em vez de `profile.business_name`

```
// Antes:
const { count: ingCount } = await supabase
  .from("ingredients")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);

// Depois:
let ingQuery = supabase
  .from("ingredients")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);
if (storeId) ingQuery = ingQuery.eq("store_id", storeId);
const { count: ingCount } = await ingQuery;
```

---

## Secao Tecnica

### Dashboard.tsx - Alteracoes

1. **fetchMetrics (linha 152-193)**: Substituir `profileData?.monthly_revenue` por query em `stores.monthly_revenue` quando `storeId` existir
2. **checkAuthAndOnboarding (linhas 115-119)**: Adicionar filtro `store_id` na busca de ingredientes existentes
3. **OnboardingProgress (linha 581)**: Passar `storeId={activeStore?.id}` e `storeName={activeStore?.name}`
4. **useEffect de re-fetch (linhas 146-150)**: Tambem re-fetch `existingIngredients` quando loja mudar

### OnboardingProgress.tsx - Alteracoes

1. Adicionar `storeId?: string` e `storeName?: string` ao tipo `OnboardingProgressProps`
2. Filtrar `ingredients` por `store_id` no `fetchCounts`
3. Adicionar `storeId` como dependencia do `useEffect`
4. Usar `storeName || profile?.business_name` na descricao do passo "Configurar Negocio"
