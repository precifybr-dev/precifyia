
## Integrar Google Analytics 4

### O que sera feito

Adicionar o script do Google Analytics 4 (gtag.js) ao projeto para rastrear automaticamente pageviews, sessoes e eventos de conversao.

### Passos

1. **Adicionar script gtag.js no `index.html`**
   - Inserir o script async do Google Tag Manager no `<head>`
   - Configurar com o ID de medicao fornecido pelo usuario

2. **Criar hook `useGoogleAnalytics.ts`**
   - Rastrear mudancas de rota automaticamente (pageview em cada navegacao via React Router)
   - Expor funcao `trackGAEvent()` para eventos customizados
   - Integrar com os eventos de funil existentes (signup, cta_click, etc.)

3. **Integrar com rotas existentes**
   - Adicionar listener de navegacao no `App.tsx` que dispara `gtag('event', 'page_view')` a cada mudanca de rota

4. **Eventos customizados trackeados**
   - `signup_started` / `signup_completed`
   - `cta_click` (com label do CTA)
   - `login`
   - `plan_view` (visualizacao da secao de planos)

### Detalhes tecnicos

- O ID de medicao (`G-XXXXXXXXXX`) sera colocado diretamente no `index.html` pois e uma chave publica (nao e secret)
- Nenhuma dependencia nova necessaria - usa o script oficial do Google
- O hook usa a API `window.gtag()` ja disponivel apos carregar o script
- Compativel com o sistema de tracking de funil ja existente (`useFunnelTracking`)

### Arquivos modificados
- `index.html` — adicionar script gtag
- `src/hooks/useGoogleAnalytics.ts` — novo hook
- `src/App.tsx` — integrar tracking de rotas

### Pre-requisito do usuario
- Criar propriedade no Google Analytics 4 e fornecer o ID de medicao (formato `G-XXXXXXXXXX`)
