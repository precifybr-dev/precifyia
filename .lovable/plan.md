
# Fix: "Sessao Invalida" no Painel de Precificacao

## Causa raiz

O erro acontece por dois motivos combinados:

1. **Token de sessao expirado/invalido**: O hook `useRecipePricing` usa `supabase.auth.getSession()` que pode retornar um token cacheado ja expirado. A Edge Function valida esse token com `getUser()` e rejeita com "Sessao invalida."

2. **Cache de deduplicacao impede retry**: Quando o calculo falha, o `lastInputRef.current` mantem o valor do input. Na proxima renderizacao com os mesmos ingredientes, o hook detecta "mesmo input" e retorna sem tentar novamente -- o erro antigo fica preso na tela.

```text
Fluxo do bug:
  1. Sessao expira no browser
  2. Hook envia token expirado -> Edge Function retorna 401
  3. Hook seta error = "Sessao invalida"
  4. Usuario faz login novamente (ou sessao renova)
  5. Componente chama calculate() com mesmos dados
  6. inputKey === lastInputRef -> return (nao tenta de novo)
  7. Erro fica preso na tela permanentemente
```

## Correcoes

### 1. Limpar cache de deduplicacao quando ha erro

No `useRecipePricing.ts`, quando ocorre erro (linhas 146-148 e 153-156), resetar `lastInputRef.current = ""` para permitir que a proxima chamada com os mesmos dados tente novamente.

### 2. Trocar `getSession()` por `getUser()` para obter token valido

Substituir `supabase.auth.getSession()` por uma abordagem que force refresh do token quando necessario. Usar `supabase.auth.getUser()` para validar e depois pegar o token atualizado.

### 3. Adicionar retry automatico em erro 401

Quando a Edge Function retornar 401, tentar um `supabase.auth.refreshSession()` e repetir a chamada uma vez antes de mostrar o erro ao usuario.

## Arquivo afetado

- `src/hooks/useRecipePricing.ts`

## Mudancas especificas

```text
Linha 103:    Mover a checagem de deduplicacao para DEPOIS da checagem de erro
Linhas 119-124: Substituir getSession() por getUser() + refresh
Linhas 146-148: Adicionar lastInputRef.current = "" no bloco de erro
Linhas 153-156: Adicionar lastInputRef.current = "" no bloco catch
Novo:          Adicionar logica de retry em caso de 401
```

## Resultado esperado

- Erro de sessao nunca fica "preso" na tela
- Se o token expirou, o hook tenta renovar automaticamente
- Se a renovacao falhar, mostra mensagem pedindo novo login
- Mesmos dados podem ser recalculados apos correcao de erro
