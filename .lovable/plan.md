

# Sistema de Creditos Bonus para o Admin

## Resumo

O administrador podera conceder creditos extras a qualquer usuario, para qualquer funcionalidade limitada do sistema. Funciona como uma "carteira de creditos bonus" que se soma ao limite do plano do usuario.

## Como funciona hoje

- Cada funcionalidade tem um limite definido na tabela `plan_features` (ex: `ai_analysis` = 10 no Basico)
- A funcao `check_and_increment_usage` conta os registros em `strategic_usage_logs` e compara com o limite
- Se o usuario atingiu o limite, a funcao bloqueia

## O que muda

O limite efetivo passa a ser: **limite do plano + creditos bonus concedidos pelo admin**

## Funcionalidades com limite que receberao suporte a bonus

| Feature | Free | Basico | Pro |
|---------|------|--------|-----|
| ai_analysis | 2 | 10 | 50 |
| combos_ai | 1 | 3 | 10 |
| ifood_import | 1 | 5 | ilimitado |
| menu_analysis | 1 | 5 | 15 |
| incremental_revenue | 5 | ilimitado | ilimitado |
| spreadsheet_import | 1 | 3 | ilimitado |
| sub_recipes | 3 | ilimitado | ilimitado |

## Implementacao

### 1. Nova tabela: `user_bonus_credits`

```sql
CREATE TABLE public.user_bonus_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  granted_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, feature)
);
```

- RLS: leitura pelo proprio usuario, escrita apenas via service_role (Edge Function admin)
- Indice em `user_id`

### 2. Atualizar `check_and_increment_usage`

A funcao passara a somar os bonus ao limite do plano:

```
limite_efetivo = v_limit + COALESCE(bonus_credits, 0)
```

Se `v_limit` e NULL (ilimitado), nao precisa verificar bonus.

### 3. Nova action na Edge Function `admin-users`: `grant_credits`

O admin envia:
```json
{
  "action": "grant_credits",
  "targetUserId": "uuid",
  "data": {
    "feature": "ai_analysis",
    "credits": 10,
    "reason": "Cortesia por problema tecnico"
  }
}
```

A Edge Function faz UPSERT na tabela `user_bonus_credits`, somando os creditos ao valor existente. Registra a acao no `admin_audit_logs`.

### 4. Hook `useAdminUsers` - nova funcao `grantCredits`

Adiciona a funcao no hook para chamar a Edge Function com a action `grant_credits`.

### 5. Interface no `UserManagement`

Ao selecionar um usuario, aparecera:
- Novo botao "Conceder Creditos" no dropdown de acoes
- Dialog com:
  - Select da funcionalidade (lista apenas features com limite)
  - Input numerico para quantidade de creditos
  - Input de texto para motivo (opcional)
  - Exibicao dos creditos atuais do usuario para aquela feature
  - Botao "Conceder"

### 6. Visualizacao dos bonus no painel do usuario

No detalhe do usuario (aba Info), exibir os bonus ativos com um badge por feature.

### 7. Frontend do usuario: exibir bonus no `PlanOverviewTab`

As barras de progresso de uso passam a considerar o limite efetivo (plano + bonus), mostrando ao usuario que ele tem creditos extras disponiveis.

## Detalhes tecnicos

### Tabela
- `user_bonus_credits` com constraint UNIQUE(user_id, feature) para permitir UPSERT
- RLS: `SELECT` para authenticated onde `user_id = auth.uid()`, sem INSERT/UPDATE/DELETE para usuarios comuns

### Funcao SQL atualizada
```sql
-- Dentro de check_and_increment_usage, apos obter v_limit:
SELECT COALESCE(credits, 0) INTO v_bonus
FROM user_bonus_credits
WHERE user_id = _user_id AND feature = _feature;

-- Limite efetivo
v_effective_limit := v_limit + v_bonus;
```

### Edge Function
- Validacao: apenas roles master/admin podem conceder
- UPSERT: `ON CONFLICT (user_id, feature) DO UPDATE SET credits = user_bonus_credits.credits + EXCLUDED.credits`
- Audit log com old_value e new_value

### Arquivos modificados
1. **Nova migration SQL** - tabela + RLS + atualizacao da funcao `check_and_increment_usage`
2. **`supabase/functions/admin-users/index.ts`** - nova action `grant_credits`
3. **`src/hooks/useAdminUsers.ts`** - nova funcao `grantCredits`
4. **`src/components/admin/UserManagement.tsx`** - dialog de concessao de creditos + exibicao de bonus
5. **`src/components/plan/PlanOverviewTab.tsx`** - exibir limite efetivo (plano + bonus) nas barras de uso
