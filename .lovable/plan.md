
# Correcao: "Erro ao carregar usuarios" - MFA nao sincroniza com o banco

## Problema

Os logs da edge function mostram repetidamente:
```
MFA not verified or expired for sensitive role
mfaExpired: true
```

E o banco de dados confirma que `mfa_verified_at` esta **null** e `mfa_verified` esta **false** para o usuario master. Isso significa que o `upsert` no `useAdminSecurity.ts` (que deveria salvar `mfa_verified: true` apos o Google re-auth) **nao esta funcionando**.

## Causa Raiz

Apos o redirecionamento do Google OAuth de volta para `/admin`, o `checkSecurityStatus` roda imediatamente. O upsert tenta atualizar `user_security`, mas **falha silenciosamente** porque:

1. A tabela `user_security` tem politica UPDATE (`auth.uid() = user_id`) mas **nao tem politica INSERT**
2. O `upsert` pode tentar um INSERT quando o conflito nao e detectado corretamente no contexto RLS
3. O erro e ignorado porque o codigo nao verifica o resultado do upsert

## Solucao

Duas mudancas:

### 1. Adicionar politica INSERT na tabela `user_security` (migracao SQL)

```sql
CREATE POLICY "Users can insert their own security"
  ON public.user_security
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

Isso garante que o upsert funciona independentemente de ser INSERT ou UPDATE.

### 2. Corrigir o `useAdminSecurity.ts` para tratar erros do upsert

Substituir o upsert silencioso por uma chamada com verificacao de erro. Caso o upsert falhe, fazer um UPDATE separado como fallback:

```typescript
// Sincronizar mfa_verified no banco
const { error: upsertError } = await supabase
  .from("user_security")
  .upsert({
    user_id: session.user.id,
    mfa_verified: true,
    mfa_enabled: true,
    mfa_verified_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

if (upsertError) {
  console.error("Upsert failed, trying update:", upsertError);
  // Fallback: tentar UPDATE direto
  await supabase
    .from("user_security")
    .update({
      mfa_verified: true,
      mfa_verified_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
}
```

### Nenhuma alteracao na edge function

A logica de verificacao MFA no `admin-users` esta correta e deve ser mantida.
