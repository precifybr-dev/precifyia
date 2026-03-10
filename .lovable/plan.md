

## Plano: Corrigir persistência da última importação iFood

### Problema identificado

O upsert na tabela `ifood_monthly_metrics` usa `onConflict: "user_id,store_id,competencia"`, mas `store_id` é `NULL` na maioria dos casos. Em PostgreSQL, `NULL ≠ NULL`, então o upsert **nunca detecta conflito** e cria uma nova linha a cada "Aplicar ao Plano". Confirmado: existem **3 linhas duplicadas** no banco para o mesmo usuário/mês.

Apesar dos duplicados, o `loadLastImport` com `ORDER BY updated_at DESC LIMIT 1` deveria retornar a linha mais recente. Porém, a função `loadLastImport` não filtra por `store_id`, o que pode retornar dados de outra loja.

### Correções

#### 1. Migração SQL — corrigir unique constraint para NULL store_id

Remover o índice existente e criar um que trate `NULL` como valor:

```sql
DROP INDEX IF EXISTS ifood_monthly_metrics_user_id_store_id_competencia_key;

CREATE UNIQUE INDEX ifood_monthly_metrics_user_store_comp_key
  ON public.ifood_monthly_metrics (user_id, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'), competencia);
```

Limpar duplicatas mantendo apenas a mais recente:

```sql
DELETE FROM ifood_monthly_metrics a
USING ifood_monthly_metrics b
WHERE a.user_id = b.user_id
  AND a.competencia = b.competencia
  AND a.store_id IS NOT DISTINCT FROM b.store_id
  AND a.updated_at < b.updated_at;
```

#### 2. Código — ajustar upsert para usar COALESCE no store_id (`IfoodSpreadsheetImportModal.tsx`)

Trocar `store_id: storeId || null` por `store_id: storeId || '00000000-0000-0000-0000-000000000000'` (sentinel UUID) para que o upsert funcione. Alternativamente, usar um insert manual com `ON CONFLICT` via RPC.

**Abordagem mais simples:** Em vez de depender do upsert do Supabase SDK (que não lida bem com NULLs), fazer um delete+insert:
- Deletar a linha existente com `user_id` + `store_id IS NULL` + `competencia`
- Inserir a nova linha

#### 3. Código — `loadLastImport` filtrar por store_id

Adicionar filtro de `store_id` no `loadLastImport`:
```ts
let query = supabase.from("ifood_monthly_metrics").select("*").eq("user_id", userId);
if (storeId) query = query.eq("store_id", storeId);
else query = query.is("store_id", null);
query = query.order("updated_at", { ascending: false }).limit(1);
```

### Arquivo editado
- `src/components/business/IfoodSpreadsheetImportModal.tsx`
- Migração SQL para corrigir duplicatas e constraint

