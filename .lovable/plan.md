
# Corrigir vazamento do faturamento entre lojas

## Problema identificado

O "Faturamento Mensal" mostrado nas "Configurações do Negócio" e no bloco de resumo vem de **duas fontes globais** que nao respeitam a loja ativa:

1. **`profiles.monthly_revenue`** -- campo unico por usuario, nao por loja. Quando a loja 2 ou 3 esta ativa, o sistema busca o mesmo valor da loja 1.
2. **`MonthlyRevenueBlock.fetchManualAverage()`** -- busca `profiles.monthly_revenue` como fallback quando nao ha historico de meses preenchidos, vazando o valor da loja 1 para lojas novas.
3. **Callback `onAverageChange`** (linha 585 de `BusinessArea.tsx`) -- escreve o valor calculado de volta no `profile` local, contaminando a exibicao das configuracoes.

## Solucao

### 1. Tornar a media manual especifica por loja

A tabela `stores` ja existe. Adicionar uma coluna `monthly_revenue` na tabela `stores` para armazenar a media manual por loja. Assim cada loja tem seu proprio valor independente.

**Migracao SQL:**
```sql
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS monthly_revenue numeric DEFAULT 0;
```

### 2. Atualizar `MonthlyRevenueBlock.tsx`

- **`fetchManualAverage()`**: Em vez de buscar de `profiles`, buscar de `stores.monthly_revenue` quando houver `storeId`. Manter fallback para `profiles` apenas quando `storeId` for null (loja padrao sem multi-store).
- **`handleSaveManualAverage()`**: Salvar em `stores` quando houver `storeId`, em vez de `profiles`.

### 3. Atualizar `BusinessArea.tsx`

- No card "Configuracoes do Negocio" (linha 456), usar `calculatedMonthlyRevenue` em vez de `profile?.monthly_revenue` para exibir o faturamento.
- Remover a linha 585 (`setProfile(...)`) que contamina o estado do perfil com dados de outra loja.
- Quando `calculatedMonthlyRevenue` for null (nenhum dado para a loja ativa), exibir "Nao informado".

## Secao Tecnica

### Migracao de banco de dados
```sql
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS monthly_revenue numeric DEFAULT 0;

-- Copiar valor atual do profiles para a loja padrao (primeira loja do usuario)
UPDATE public.stores s
SET monthly_revenue = p.monthly_revenue
FROM public.profiles p
WHERE s.user_id = p.user_id
  AND p.monthly_revenue IS NOT NULL
  AND p.monthly_revenue > 0
  AND s.id = (
    SELECT id FROM public.stores 
    WHERE user_id = p.user_id 
    ORDER BY created_at ASC 
    LIMIT 1
  );
```

### MonthlyRevenueBlock.tsx

**fetchManualAverage** -- mudar de:
```typescript
const { data } = await supabase
  .from("profiles")
  .select("monthly_revenue")
  .eq("user_id", userId)
  .maybeSingle();
```
Para:
```typescript
if (storeId) {
  const { data } = await supabase
    .from("stores")
    .select("monthly_revenue")
    .eq("id", storeId)
    .maybeSingle();
  if (data?.monthly_revenue) {
    setManualAverage(Number(data.monthly_revenue));
  } else {
    setManualAverage(null);
  }
} else {
  const { data } = await supabase
    .from("profiles")
    .select("monthly_revenue")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.monthly_revenue) {
    setManualAverage(Number(data.monthly_revenue));
  } else {
    setManualAverage(null);
  }
}
```

**handleSaveManualAverage** -- salvar em `stores` quando `storeId` existir.

### BusinessArea.tsx

**Linha 456** -- substituir `profile?.monthly_revenue` por `calculatedMonthlyRevenue`:
```typescript
{calculatedMonthlyRevenue !== null
  ? `R$ ${calculatedMonthlyRevenue.toLocaleString(...)}`
  : "Não informado"}
```

**Linha 585** -- remover `setProfile(...)` para nao contaminar o estado global.
