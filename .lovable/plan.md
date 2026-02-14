

## Plano: CTAs Variados + Funil de Conversao no Admin

### Parte 1 -- Variar os textos dos CTAs na Landing Page

Todos os botoes atualmente dizem "Calcular meu lucro agora". Vamos diversificar mantendo "Teste por 7 dias" nos principais iniciais:

| Secao | CTA Atual | Novo CTA |
|-------|-----------|----------|
| **Header** (desktop/mobile) | Calcular meu lucro agora | Teste gratis por 7 dias |
| **HeroSection** | Calcular meu lucro agora | Teste gratis por 7 dias |
| **PainSection** | Calcular meu lucro agora | Quero proteger meu lucro |
| **ComparisonSection** | Calcular meu lucro agora | Experimentar o Precify |
| **DemoSection** | Calcular meu lucro agora | Quero calcular tudo automaticamente |
| **DifferentialsSection** | Calcular meu lucro agora | Comecar meu teste gratis |
| **PricingSection** (Free) | Testar por 7 dias | Testar por 7 dias (mantido) |
| **PricingSection** (Basico/Pro) | Calcular meu lucro agora | Comecar agora |
| **FinalCTASection** | Calcular meu lucro agora | Teste gratis por 7 dias |

Cada botao tera um atributo `data-cta-id` unico (ex: `hero_cta`, `pain_cta`, `comparison_cta`) para rastreamento.

### Parte 2 -- Rastreamento de Cliques nos CTAs

- Adicionar tracking anonimo (sem login) dos cliques em cada CTA usando a tabela `platform_events` ou uma nova tabela `funnel_events` dedicada
- Cada clique registra: `event_type`, `cta_id`, `timestamp`, `session_id` (anonimo via localStorage), `referrer`, `utm_source/medium/campaign`
- O registro acontece ANTES de redirecionar para `/register`

### Parte 3 -- Tabela `funnel_events` no banco de dados

Nova tabela para rastrear todo o funil de conversao:

```
funnel_events
- id (uuid, PK)
- anonymous_id (text) -- ID anonimo do visitante (gerado no browser)
- user_id (uuid, nullable) -- Preenchido apos criar conta
- event_type (text) -- 'cta_click', 'page_visit', 'signup_started', 'signup_completed', 'trial_started', 'checkout_opened', 'payment_completed', 'payment_abandoned', 'trial_expired', 'trial_converted'
- cta_id (text, nullable) -- Ex: 'hero_cta', 'pain_cta'
- metadata (jsonb) -- UTM params, referrer, user agent
- created_at (timestamptz)
```

RLS: INSERT aberto (anonimo pode inserir); SELECT apenas para admin/master.

### Parte 4 -- Registro dos eventos do funil

Pontos de captura dos eventos:

1. **cta_click** -- No clique de cada botao CTA da landing (anonimo)
2. **signup_started** -- Quando abre a pagina `/register`
3. **signup_completed** -- Apos criar conta com sucesso
4. **trial_started** -- Quando o perfil e criado (via trigger ou edge function)
5. **checkout_opened** -- Quando o usuario abre a pagina/modal de pagamento
6. **payment_completed** -- Quando o pagamento e confirmado
7. **payment_abandoned** -- Quando abre checkout mas nao finaliza (via timeout ou saida)
8. **trial_expired** -- Quando os 7 dias acabam sem pagamento (via cron ou calculo)

### Parte 5 -- Dashboard de Funil no Admin

Nova aba **"Funil"** no painel administrativo com visualizacao profissional:

**Grafico de Funil Vertical** mostrando:

```
Visitantes que clicaram CTA ........... 1.250
        |
Abriram pagina de cadastro ............ 890 (71,2%)
        |
Criaram conta ......................... 420 (33,6%)
        |
Iniciaram trial ....................... 418 (33,4%)
        |
Abriram carrinho de pagamento ......... 85 (6,8%)
        |
Finalizaram pagamento ................. 42 (3,4%)
```

**Metricas complementares:**
- Taxa de abandono por etapa (percentual de queda entre cada nivel)
- Usuarios que o trial expirou sem pagar
- Usuarios que abriram carrinho mas desistiram
- Top CTAs que mais convertem (qual botao gera mais signups)

**Tabela detalhada:**
- Lista dos ultimos eventos com email (quando disponivel), data, etapa e CTA de origem
- Filtros por periodo (7d, 30d, 90d)

**Cards KPI no topo:**
- Total de cliques em CTA (periodo)
- Taxa de conversao CTA -> Signup
- Taxa de conversao Trial -> Pagamento
- Taxa de abandono de carrinho

### Detalhes Tecnicos

**Arquivos criados:**
- `src/components/admin/FunnelDashboard.tsx` -- Componente completo do funil com graficos (Recharts), KPIs e tabela
- `src/hooks/useFunnelTracking.ts` -- Hook para registrar eventos anonimos do funil (usado na landing e no register)
- `src/hooks/useFunnelData.ts` -- Hook para buscar dados agregados do funil (usado no admin)

**Arquivos modificados:**
- `src/components/landing/HeroSection.tsx` -- CTA variado + tracking
- `src/components/landing/PainSection.tsx` -- CTA variado + tracking
- `src/components/landing/ComparisonSection.tsx` -- CTA variado + tracking
- `src/components/landing/DemoSection.tsx` -- CTA variado + tracking
- `src/components/landing/DifferentialsSection.tsx` -- CTA variado + tracking
- `src/components/landing/PricingSection.tsx` -- CTA variado + tracking
- `src/components/landing/FinalCTASection.tsx` -- CTA variado + tracking
- `src/components/landing/Header.tsx` -- CTA variado + tracking
- `src/pages/Register.tsx` -- Registrar evento `signup_started` e `signup_completed`
- `src/pages/AdminDashboard.tsx` -- Adicionar aba "Funil" com o componente FunnelDashboard

**Migracao SQL:**
- Criar tabela `funnel_events` com RLS (insert anonimo, select admin)
- Indice em `event_type` e `created_at` para consultas rapidas
