

# Correção dos 3 Avisos de Segurança

## Problema
O scanner de segurança identificou 3 avisos que precisam ser corrigidos:

1. **Leaked Password Protection Disabled** - Proteção contra senhas vazadas está desativada
2. **RLS Policy Always True** - Políticas de segurança permissivas demais
3. **Admin Metrics View Exposed to All Users** - Métricas administrativas acessíveis por todos

---

## Plano de Correção

### 1. Leaked Password Protection
Essa configuração é feita no nível da plataforma (Lovable Cloud Auth Settings) e não pode ser ativada via código. Vou marcar como resolvida na verificação após você ativá-la manualmente nas configurações do projeto.

### 2. RLS Policy Always True (3 políticas)

As seguintes políticas usam `true` de forma permissiva:

| Tabela | Política | Tipo | Ação |
|--------|----------|------|------|
| `funnel_events` | Anyone can insert funnel events | INSERT WITH CHECK (true) | Restringir para usuários autenticados com `auth.uid() IS NOT NULL` |
| `plan_features` | Authenticated users can read plan features | SELECT USING (true) | SELECT com `true` é aceitável (leitura pública) - será ignorado |
| `role_permissions` | Authenticated users can view role permissions | SELECT USING (true) | SELECT com `true` é aceitável (leitura pública) - será ignorado |

Apenas a política de INSERT em `funnel_events` precisa de correção real. As de SELECT são padrões aceitáveis para dados de leitura pública.

### 3. Admin Metrics View
Revogar acesso direto à view `admin_metrics` para o role `authenticated`, garantindo que só seja acessível via a função `get_admin_metrics()` que já tem verificação de role master/admin.

---

## Alterações Técnicas

### Migration SQL
```sql
-- 1. Corrigir política de funnel_events
DROP POLICY IF EXISTS "Anyone can insert funnel events" ON public.funnel_events;
CREATE POLICY "Authenticated users can insert funnel events"
  ON public.funnel_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Revogar acesso direto à view admin_metrics
REVOKE ALL ON public.admin_metrics FROM authenticated;
REVOKE ALL ON public.admin_metrics FROM anon;
```

### Marcar avisos resolvidos
Após aplicar as migrations, atualizar os findings de segurança para refletir as correções.

### Sobre o Leaked Password Protection
Será necessário ativar manualmente nas configurações do Lovable Cloud. Não é possível fazer via código.

