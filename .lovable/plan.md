
# Substituir MFA por Email com Re-autenticacao Google

## Problema
O sistema MFA atual envia codigos por email, mas como nao ha `RESEND_API_KEY` configurada, o codigo e retornado diretamente ao frontend e exibido como "Modo Desenvolvimento". Isso e uma vulnerabilidade critica - qualquer pessoa que acesse a tela ve o codigo de verificacao.

## Solucao
Substituir o sistema de codigo por email com **re-autenticacao via Google**. Quando o usuario Master/Financeiro acessar o painel admin, sera exigido que ele se autentique novamente via Google para provar sua identidade. Isso e mais seguro, nao depende de servicos de email, e elimina completamente a exposicao de codigos.

## Fluxo do Usuario
1. Usuario Master acessa `/admin`
2. O `AdminSecurityGate` exibe tela de verificacao com botao "Verificar com Google"
3. Usuario clica no botao, e redirecionado para o Google OAuth com `prompt: "login"` (forca re-autenticacao)
4. Apos autenticacao bem-sucedida, o sistema verifica que o email do Google corresponde ao usuario logado
5. Sessao admin e liberada por 30 minutos (comportamento existente mantido via sessionStorage)

## Detalhes Tecnicos

### Arquivo 1: `src/hooks/useAdminSecurity.ts`
- Remover `requestMfaCode` e `verifyMfaCode` (funcoes de codigo por email)
- Adicionar `verifyWithGoogle()` que:
  - Salva flag `admin_mfa_pending` no sessionStorage antes de redirecionar
  - Chama `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/admin", extraParams: { prompt: "login" } })`
- Na `checkSecurityStatus`, verificar se existe `admin_mfa_pending` no sessionStorage:
  - Se sim, verificar que a sessao e recente (ultimos 60 segundos), o que confirma que o usuario acabou de re-autenticar com Google
  - Marcar como verificado, salvar no sessionStorage com timestamp, limpar flag pending
  - Registrar acesso no log

### Arquivo 2: `src/components/admin/AdminSecurityGate.tsx`
- Remover toda a logica de OTP/codigo (InputOTP, devCode, timer, passos sending/verify)
- Simplificar para 2 estados: "initial" (mostra botao Google) e "verifying" (loading)
- O botao unico sera "Verificar com Google" com icone do Google
- Manter os botoes "Voltar ao Dashboard" e "Sair da conta"
- Remover completamente o bloco "Modo Desenvolvimento" que expoe o codigo

### Arquivo 3: `supabase/functions/send-mfa-code/index.ts`
- Remover a linha que retorna `devCode` ao frontend (linhas 136-137)
- Mesmo que a funcao continue existindo para outros usos futuros, nunca mais retornar o codigo na resposta
- Alternativa: manter a funcao mas tornar inofensiva removendo o fallback de devCode

### Nenhuma mudanca necessaria no banco de dados
- A tabela `user_security` e o sessionStorage continuam sendo usados para controle de sessao
- A verificacao de 30 minutos via sessionStorage permanece identica
