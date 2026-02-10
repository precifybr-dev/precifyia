
# Correcao: Erro "Edge Function returned a non-2xx status code" no Modo Suporte

## Causa Raiz

A edge function `admin-users` (linhas 174-193) verifica se `mfa_verified = true` na tabela `user_security` antes de permitir qualquer acao administrativa. Porem, quando implementamos a re-autenticacao via Google, a verificacao passou a ser salva apenas no `sessionStorage` do navegador — o banco de dados nunca e atualizado. Resultado: toda chamada a `admin-users` retorna **403** com a mensagem "Verificacao MFA necessaria".

## Solucao

Atualizar o campo `mfa_verified` na tabela `user_security` apos a re-autenticacao Google ser concluida com sucesso. Isso sincroniza o estado entre o frontend (sessionStorage) e o backend (banco de dados).

## Detalhes Tecnicos

### Arquivo: `src/hooks/useAdminSecurity.ts`

Na funcao `checkSecurityStatus`, logo apos confirmar que o usuario re-autenticou via Google (dentro do bloco `if (now - pendingTime < REAUTH_WINDOW_MS)`), adicionar uma chamada para atualizar `user_security` no banco:

```text
// Apos confirmar Google re-auth:
await supabase
  .from("user_security")
  .upsert({
    user_id: session.user.id,
    mfa_verified: true,
    mfa_enabled: true,
  }, { onConflict: "user_id" });
```

Isso garante que quando a edge function `admin-users` verificar `securityData?.mfa_verified`, o valor sera `true` e a requisicao sera permitida.

### Nenhuma alteracao na edge function

A logica de verificacao no backend (`admin-users`) esta correta e deve ser mantida como esta — ela e uma camada de seguranca importante. O problema e apenas que o frontend nao estava atualizando o banco apos a verificacao.
