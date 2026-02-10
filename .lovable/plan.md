

# Proteger campos de plano contra alteracao pelo usuario

## Problema

A tabela `profiles` possui uma politica de UPDATE que permite ao usuario alterar qualquer coluna da sua linha, incluindo `user_plan`, `subscription_status` e `subscription_expires_at`. Isso significa que um usuario com conhecimento tecnico poderia abrir o console do navegador e executar:

```javascript
supabase.from('profiles').update({ user_plan: 'pro', subscription_status: 'active' }).eq('user_id', '...')
```

E ganhar acesso ao plano Pro sem pagar.

## Solucao

Criar uma funcao SECURITY DEFINER no banco que valida se os campos protegidos estao sendo alterados pelo usuario. Se estiverem, a alteracao e bloqueada via trigger BEFORE UPDATE.

### Migracao SQL

1. Criar trigger `protect_plan_fields` na tabela `profiles` que impede usuarios comuns de alterar os campos:
   - `user_plan`
   - `subscription_status`
   - `subscription_expires_at`

2. A funcao do trigger verifica:
   - Se algum desses campos esta mudando (OLD vs NEW)
   - Se o chamador NAO e `service_role` (usado pelas Edge Functions administrativas)
   - Se for usuario comum tentando alterar, restaura os valores originais (OLD) silenciosamente

3. Isso permite que:
   - Edge Functions (admin-users) continuem alterando planos normalmente (usam service_role)
   - Usuarios atualizem seus dados normais (business_name, monthly_revenue, etc)
   - Usuarios NAO consigam alterar seu proprio plano

### Detalhes tecnicos da funcao

```sql
CREATE OR REPLACE FUNCTION public.protect_plan_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se NAO e service_role, impedir alteracao dos campos de plano
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    NEW.user_plan := OLD.user_plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_plan_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_plan_fields();
```

### Por que trigger em vez de RLS separada?

- RLS com politicas por coluna nao existe no Postgres (RLS e por linha, nao por coluna)
- Separar em duas tabelas seria uma refatoracao grande e quebraria muitas queries existentes
- O trigger BEFORE UPDATE e a forma mais segura e menos invasiva de proteger campos especificos

### Impacto

- Nenhuma alteracao no frontend necessaria
- Edge Functions continuam funcionando normalmente (usam `createClient` com service_role key)
- Usuarios podem continuar atualizando seus dados de negocio sem problemas
- Campos de plano ficam 100% protegidos contra manipulacao client-side

### Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar funcao + trigger `protect_plan_fields` |

Nenhum arquivo de codigo precisa ser alterado.
