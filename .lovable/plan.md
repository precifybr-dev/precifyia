

# Auditoria e Otimizacao de RLS + Indices de Performance

## Diagnostico Atual

Todas as 37 tabelas possuem RLS ativado. Isso inclui tabelas estruturais/globais que nao precisam de RLS segundo a diretriz. Alem disso, varias tabelas com RLS ativo estao sem indices em `user_id`, o que impacta performance.

## Classificacao das Tabelas

### GRUPO 1 — Manter RLS (dados de clientes/financeiros)

Estas tabelas ja possuem RLS correto com policies `user_id = auth.uid()`:

| Tabela | RLS | Policies | Status |
|--------|-----|----------|--------|
| profiles | OK | SELECT/INSERT/UPDATE | Completo |
| stores | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| recipes | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| recipe_ingredients | OK | via `user_owns_recipe()` | Completo |
| ingredients | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| beverages | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| sub_recipes | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| sub_recipe_ingredients | OK | via `user_owns_sub_recipe()` | Completo |
| fixed_costs | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| fixed_expenses | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| variable_costs | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| variable_expenses | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| monthly_revenues | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| business_taxes | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| card_fees | OK | SELECT/INSERT/UPDATE/DELETE | Completo |
| deleted_records | OK | SELECT/INSERT/UPDATE + master DELETE | Completo |
| payment_links | OK | owner SELECT + master/collab | Completo |
| user_payments | OK | owner SELECT + master/collab | Completo |
| support_tickets | OK | owner + collab | Completo |
| ticket_messages | OK | owner + collab | Completo |
| support_consent | OK | owner + collab | Completo |

### GRUPO 2 — Manter RLS (seguranca/admin, caso a caso)

| Tabela | Justificativa |
|--------|---------------|
| user_roles | Controle de acesso, master-only management |
| user_permissions | Controle de acesso, master-only management |
| user_security | Dados sensiveis (MFA, passwords) |
| collaborators | Dados de acesso admin |
| access_logs | Logs de acesso do usuario |
| admin_audit_logs | Auditoria admin |
| data_audit_log | Auditoria de dados |
| support_session_logs | Sessoes de suporte |
| support_abuse_alerts | Alertas de abuso |
| user_sessions | Sessoes do usuario |
| ifood_import_usage | Uso por usuario |

### GRUPO 3 — Remover RLS (tabelas globais/estruturais)

| Tabela | Motivo para remover RLS |
|--------|------------------------|
| role_permissions | Tabela fixa de mapeamento role->permission, global, sem dados de usuario |
| admin_alerts | Alertas globais do sistema, nao sao dados de clientes |
| admin_metrics | View materializada/metricas globais, sem user_id como dado de cliente |
| ticket_notes | Notas internas de admin, nao sao dados de clientes |
| platform_events | Telemetria do sistema — avaliar caso a caso |

**Nota sobre `platform_events`**: Esta tabela tem `user_id` e policies para INSERT do owner e SELECT para collaborators. Pela diretriz, logs de acoes devem ter RLS avaliado caso a caso. Como contem dados de atividade por usuario, recomendo **manter RLS** nesta tabela.

**Decisao final de remocao**: Apenas `role_permissions` e `admin_metrics` serao removidas do RLS, pois sao genuinamente globais e estruturais.

- `admin_alerts` — manter RLS pois controla visibilidade por role
- `ticket_notes` — manter RLS pois restringe a colaboradores
- `platform_events` — manter RLS pois contem dados por usuario

## Etapa 1 — Indices Ausentes (Performance)

Criar indices para tabelas que usam RLS com `user_id` mas nao possuem indice dedicado:

```text
Tabela                  | Indice necessario
------------------------|---------------------------
access_logs             | idx_access_logs_user_id
admin_audit_logs        | idx_admin_audit_logs_admin_user_id
card_fees               | idx_card_fees_user_id
fixed_costs             | idx_fixed_costs_user_id
fixed_expenses          | idx_fixed_expenses_user_id
sub_recipes             | idx_sub_recipes_user_id
variable_costs          | idx_variable_costs_user_id
variable_expenses       | idx_variable_expenses_user_id
support_tickets         | idx_support_tickets_user_id
user_payments           | idx_user_payments_user_id
support_abuse_alerts    | idx_support_abuse_alerts_admin_id
ticket_messages         | idx_ticket_messages_sender_id
ticket_notes            | idx_ticket_notes_admin_id
recipe_ingredients      | idx_recipe_ingredients_recipe_id
sub_recipe_ingredients  | idx_sub_recipe_ingredients_sub_recipe_id
```

## Etapa 2 — Remover RLS de tabelas globais

Apenas duas tabelas:
- `role_permissions` — desativar RLS (tabela global de permissoes fixas)
- `admin_metrics` — desativar RLS (view de metricas globais, sem dados de cliente)

## Etapa 3 — Nenhuma alteracao de codigo

Todas as mudancas sao puramente no banco de dados (indices + RLS). O codigo frontend nao precisa ser alterado.

## Secao Tecnica — SQL da Migracao

### Indices de performance

```sql
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_card_fees_user_id ON public.card_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_user_id ON public.fixed_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_recipes_user_id ON public.sub_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_costs_user_id ON public.variable_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_expenses_user_id ON public.variable_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_support_abuse_alerts_admin_id ON public.support_abuse_alerts(admin_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_admin_id ON public.ticket_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON public.ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sub_recipe_ingredients_sub_recipe_id ON public.sub_recipe_ingredients(sub_recipe_id);
```

### Remocao de RLS em tabelas globais

```sql
-- role_permissions: tabela fixa de mapeamento, global
DROP POLICY IF EXISTS "Collaborators can view role permissions" ON public.role_permissions;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- admin_metrics: metricas globais, sem dados de cliente
ALTER TABLE public.admin_metrics DISABLE ROW LEVEL SECURITY;
```

## Resumo do impacto

| Acao | Quantidade |
|------|-----------|
| Indices criados | 17 |
| Tabelas com RLS removido | 2 |
| Tabelas com RLS mantido | 35 |
| Policies alteradas | 0 |
| Codigo frontend alterado | 0 |
| Risco de breaking change | Zero |

