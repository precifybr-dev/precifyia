## Plano: Auditoria e Unificação dos Planos

### Problema Identificado

Existem **6 arquivos** com valores de planos hardcoded e **todos estão desalinhados entre si**. Além disso, o banco de dados não rastreia limites de `recipes` e `ingredients`, que são os recursos mais visíveis ao usuário.

### Divergências Encontradas

```text
Recurso              | Correto (memória)  | Landing  | Admin  | PlansTab | UpgradePrompt
─────────────────────┼────────────────────┼──────────┼────────┼──────────┼──────────────
Fichas (free)        | 10                 | 2 ❌     | 2 ❌   | 10 ✅    | 2 ❌
Insumos (free)       | 80                 | 35 ❌    | 35 ❌  | 80 ✅    | 35 ❌
Fichas (essencial)   | 40                 | 8 ❌     | 8 ❌   | 40 ✅    | 8 ❌
Insumos (essencial)  | 200                | 100 ❌   | 100 ❌ | 200 ✅   | 100 ❌
Combos (pro)         | 10                 | 5 ❌     | 5 ❌   | 10 ✅    | — 
Sub-receitas (free)  | 3                  | 3 ✅     | —      | —        | —
Importação planilha  | free=1             | 1 ✅     | 1 ✅   | —        | —
```

### Valores Canônicos (fonte da verdade)


| Recurso                  | Teste (7 dias grátis) | Essencial (R$ 97/mês) | Pro (R$ 147/mês)     |
| ------------------------ | --------------------- | --------------------- | -------------------- |
| Fichas técnicas          | Até 10                | Até 40                | Ilimitadas           |
| Insumos                  | Até 80                | Até 200               | Ilimitados           |
| Sub-receitas             | Até 3                 | Ilimitado             | Ilimitado            |
| Dashboard                | Avançado + DRE        | Avançado + DRE        | Avançado + DRE       |
| Análise de cardápio (IA) | 1 (total no período)  | 5/mês                 | 15/mês               |
| Combos estratégicos (IA) | 1 (total no período)  | 3/mês                 | 10/mês               |
| Importação iFood         | 1 (total no período)  | 5/mês                 | Ilimitada            |
| Importação planilha      | 2 (total no período)  | 7/mês                 | Ilimitada            |
| Receita incremental      | Até 5 análises        | Ilimitado             | Ilimitado            |
| Exportação de dados      | Indisponível          | Incluso               | Incluso              |
| Multi-loja               | 1 loja                | 1 loja                | Até 3 lojas          |
| Colaboradores            | Indisponível          | Indisponível          | Incluso              |
| Suporte                  | Padrão                | Padrão                | Prioritário WhatsApp |


### Etapas de Implementação

**1. Atualizar banco de dados** — adicionar features `recipes` e `ingredients` na tabela `plan_features`:

- free: recipes=10, ingredients=80
- basic: recipes=40, ingredients=200
- pro: recipes=-1 (ilimitado), ingredients=-1 (ilimitado)

**2. Unificar 5 arquivos com valores hardcoded:**

- `src/components/landing/PlanComparisonTable.tsx` — atualizar tabela de comparação (2→10 fichas, 35→80 insumos, 8→40, 100→200, combos pro 5→10)
- `src/components/landing/PricingSection.tsx` — atualizar fallback plans com valores corretos
- `src/components/upsell/PlanUpgradePrompt.tsx` — atualizar fallback plans
- `src/components/admin/PlanLimitsTable.tsx` — atualizar tabela admin com valores corretos
- `src/components/plan/PlanComparisonTableStrategic.tsx` — já está correto, apenas verificar

**3. Atualizar `PlanOverviewTab.tsx`:**

- Adicionar tracking de uso para: importação iFood, sub-receitas, lojas
- Mostrar o checklist completo do que o plano entrega (não apenas uso)
- Adicionar seção "O que seu plano inclui" com checklist visual de todas as features

**4. Atualizar `DashboardUpgradeNudge.tsx`:**

- Garantir que os badges de features bloqueadas estejam alinhados com os valores canônicos

### Arquivos Modificados

- `src/components/landing/PlanComparisonTable.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/upsell/PlanUpgradePrompt.tsx`
- `src/components/admin/PlanLimitsTable.tsx`
- `src/components/plan/PlanOverviewTab.tsx`
- Database: INSERT into `plan_features` (recipes, ingredients)