

# Corrigir Créditos Bônus no Menu e Receita Incremental

## Problema Identificado

O admin concedeu 12 créditos bônus para `menu_analysis`, mas o frontend continua exibindo "10 de 10 análises usadas". O problema tem **duas causas**:

1. **Feature name errado**: O hook `useMenuMirror.ts` busca `plan_features` com `feature = "analyze-menu-performance"` (nome do endpoint), mas o nome correto na tabela e `"menu_analysis"`. Por isso cai no fallback hardcoded.

2. **Bonus nunca consultado**: Nem `useMenuMirror.ts` nem `useIncrementalRevenue.ts` consultam a tabela `user_bonus_credits` para somar ao limite do plano.

## O que sera feito

### 1. Corrigir `useMenuMirror.ts` - fetchAnalysisUsage

- Trocar a query de `plan_features` para usar `feature = "menu_analysis"` (nome correto)
- Adicionar consulta a `user_bonus_credits` para obter bonus
- Calcular `effectiveLimit = planLimit + bonus`
- Retornar o limite efetivo no state `analysisUsage`

### 2. Corrigir `useIncrementalRevenue.ts` - fetchUsage

- Adicionar consulta a `user_bonus_credits` para obter bonus de `incremental_revenue`
- Calcular `effectiveLimit = planLimit + bonus`
- Retornar o limite efetivo no state `usage`

### 3. Corrigir `PlanOverviewTab.tsx` - featureKeys

- Verificar se os featureKeys usados para buscar bonus (`menu_analysis`, `combos_ai`, etc.) estao alinhados com os nomes reais na tabela `plan_features` e `user_bonus_credits`
- Atualmente usa featureKeys como `"menu_analysis"` no PlanOverviewTab mas o endpoint para contagem e `"analyze-menu-performance"` — garantir que a contagem de uso e o limite se refiram ao mesmo universo

## Detalhes tecnicos

### useMenuMirror.ts (fetchAnalysisUsage)

Antes:
```typescript
.eq("feature", "analyze-menu-performance") // ERRADO
// sem consulta de bonus
const limit = planFeature?.usage_limit ?? fallback;
setAnalysisUsage({ used, limit, plan });
```

Depois:
```typescript
.eq("feature", "menu_analysis") // CORRETO
// + consulta user_bonus_credits
const bonus = bonusData?.credits ?? 0;
const effectiveLimit = planLimit + bonus;
setAnalysisUsage({ used, limit: effectiveLimit, plan });
```

### useIncrementalRevenue.ts (fetchUsage)

Antes:
```typescript
const limit = planFeature.usage_limit; // sem bonus
setUsage({ used, limit, plan });
```

Depois:
```typescript
const bonus = bonusData?.credits ?? 0;
const effectiveLimit = limit !== null ? limit + bonus : limit;
setUsage({ used, limit: effectiveLimit, plan });
```

### Arquivos modificados
1. `src/hooks/useMenuMirror.ts` - corrigir feature name + adicionar bonus
2. `src/hooks/useIncrementalRevenue.ts` - adicionar bonus
3. `src/components/plan/PlanOverviewTab.tsx` - alinhar featureKeys se necessario
