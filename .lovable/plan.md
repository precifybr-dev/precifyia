

## Recomendação: Manter o banner de cookies

**Sim, deve manter.** O banner é necessário por dois motivos:

1. **LGPD (Lei Geral de Proteção de Dados)**: Sites brasileiros que usam cookies de análise (Google Analytics) precisam informar e obter consentimento do usuário.
2. **Você já tem a Política de Cookies** (`/cookies`) referenciada no banner — remover o banner quebraria essa conformidade.

**O que recomendo corrigir**: Trocar o armazenamento de `localStorage` para um **cookie real com expiração de 1 ano**. Isso resolve o problema de ele reaparecer toda vez, porque:
- Cookies persistem melhor entre sessões
- É semanticamente correto (consentimento de cookies salvo em cookie)
- Funciona mesmo em contextos onde `localStorage` pode ser limpo

### Implementação

**Arquivo**: `src/components/CookieConsent.tsx`

- Substituir `localStorage.getItem("cookie-consent")` por `document.cookie` para leitura
- Substituir `localStorage.setItem(...)` por `document.cookie = "cookie-consent=accepted; max-age=31536000; path=/; SameSite=Lax"`
- Mesma lógica visual, só muda o mecanismo de persistência

É uma mudança de ~6 linhas no mesmo arquivo.

