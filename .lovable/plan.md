

# Correcao: Constante `MAX_SESSIONS_PER_ADMIN_PER_DAY` nao definida

## Problema

O erro ocorre ao clicar em "Modo Suporte" no painel admin. A Edge Function `admin-users` tenta usar a constante `MAX_SESSIONS_PER_ADMIN_PER_DAY` (linha 682), mas ela nunca foi declarada no arquivo. Foi removida acidentalmente junto com outras configuracoes de rate limit (linha 18 tem o comentario "Rate limit config removed").

## Solucao

Adicionar a constante no topo do arquivo `supabase/functions/admin-users/index.ts`, logo apos os CORS headers:

```typescript
const MAX_SESSIONS_PER_ADMIN_PER_DAY = 10;
```

O valor 10 e um padrao razoavel para limitar sessoes de suporte por admin por dia. Pode ser ajustado conforme necessidade.

## Arquivo modificado

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/admin-users/index.ts` | Adicionar constante `MAX_SESSIONS_PER_ADMIN_PER_DAY = 10` na linha 18 |

## Impacto

- Corrige o erro 500 ao iniciar modo suporte
- Mantem o limite de seguranca de sessoes diarias por admin
- Nenhuma outra mudanca necessaria

