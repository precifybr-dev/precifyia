

## Explicação do Erro

### O que é `_app_role`?

No PostgreSQL, quando você cria um tipo como `CREATE TYPE app_role AS ENUM (...)`, o banco automaticamente cria um tipo interno chamado `_app_role` que representa **arrays desse tipo** (`app_role[]`). Você nunca cria `_app_role` manualmente — ele é um subproduto automático.

### Por que o erro acontece?

Na migration `20260128180111`, linha 27, a tabela `admin_alerts` tem:

```sql
target_roles app_role[] DEFAULT NULL
```

O PostgreSQL traduz `app_role[]` para `_app_role` internamente. Se o tipo `app_role` não existir no momento da execução dessa migration, o erro `tipo "_app_role" não existe` aparece.

**Causa raiz**: A migration que cria o enum `app_role` (`20260128173337`) pode ter falhado ou não ter sido executada antes dessa migration. Isso pode acontecer em re-execuções parciais ou restaurações de banco.

### Impacto no sistema

- **Tabela `admin_alerts`** não foi criada → alertas do admin não funcionam
- **Funções `get_registration_stats`, `get_mrr_stats`, `get_recent_users`** dessa mesma migration também podem não existir
- O resto do sistema (RBAC, recipes, ingredients) **não é afetado** pois estão em outras migrations

### Solução

Criar uma migration corretiva que:

1. Verifica se o tipo `app_role` existe (deve existir, pois o RBAC funciona)
2. Recria a tabela `admin_alerts` com `app_role[]` usando `IF NOT EXISTS`
3. Recria as policies e funções que dependem dessa migration

```sql
-- Garantir que o enum existe
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'master', 'suporte', 'financeiro', 'analista');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recriar tabela admin_alerts
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  target_roles app_role[] DEFAULT NULL
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Policies (IF NOT EXISTS via DO block)
-- Recriar funções get_registration_stats, get_mrr_stats, get_recent_users
```

### Arquivos
- 1 nova migration SQL (corretiva, idempotente)
- Nenhuma alteração no frontend necessária

