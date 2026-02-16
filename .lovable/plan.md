
# Atualizar beneficios dos planos e mostrar creditos de analise no Cardapio

## Resumo

Tres mudancas principais:
1. Atualizar os beneficios exibidos na Landing Page (PricingSection) e no modal de upgrade (PlanUpgradePrompt) para refletir os limites reais
2. Mostrar no menu "Meu Cardapio" a quantidade de analises usadas/disponiveis do usuario
3. Deixar claro que os limites sao por conta, nao por loja

## O que muda para o usuario

- Na pagina inicial (precos), os planos vao mostrar os limites corretos de analise de cardapio: Free = 1 analise unica, Essencial = 5/mes, Pro = 10/mes
- O modal de upgrade (quando o usuario atinge um limite) vai mostrar beneficios atualizados e realistas
- Na pagina "Meu Cardapio", abaixo do botao "Analisar Cardapio" ou no topo do dashboard de performance, aparece uma linha sutil tipo: "3 de 5 analises usadas este mes" com uma barra de progresso pequena
- Para o plano Free, a mensagem sera: "1 de 1 analise usada (unica)" sem mencao de "mes"

## Secao Tecnica

### Arquivo 1: `src/components/landing/PricingSection.tsx`

Atualizar os `fallbackPlans` para alinhar com os limites reais da tabela `plan_features`:

| Recurso | Teste (free) | Essencial (basic) | Pro |
|---|---|---|---|
| Fichas tecnicas | Ate 3 | Ate 8 | Ilimitadas |
| Insumos | Ate 35 | Ate 100 | Ilimitados |
| Dashboard | Basico | Completo | Avancado + DRE |
| Analise de cardapio (IA) | 1 analise unica | 5 analises/mes | 10 analises/mes |
| Importacao de planilha | Nao | Sim | Sim |
| Multi-loja | Nao | Nao | Ate 3 lojas |
| Combos estrategicos | Nao | Nao | Sim |

Mudancas especificas:
- Free: "1 analise de cardapio por IA" -> "1 analise de cardapio (unica)"
- Basic: "3 analises de cardapio por IA" -> "5 analises de cardapio/mes"
- Pro: "Analise de cardapio ilimitada" -> "10 analises de cardapio/mes"
- Pro: "Multi-loja + equipe" -> "Ate 3 lojas (limites por conta)"

### Arquivo 2: `src/components/upsell/PlanUpgradePrompt.tsx`

Atualizar os arrays `PLAN_BENEFITS` para refletir a realidade:

- `basic`: Incluir "5 analises de cardapio/mes", "Ate 8 fichas tecnicas", "Importacao de planilha", "Dashboard completo"
- `pro`: Incluir "10 analises de cardapio/mes", "Fichas tecnicas ilimitadas", "Ate 3 lojas (limites por conta)", "Combos estrategicos com IA", "Dashboard avancado + DRE"

Atualizar precos para os valores reais:
- basic: "R$ 97,00"
- pro: "R$ 147,00"

### Arquivo 3: `src/hooks/useMenuMirror.ts`

Adicionar funcao para buscar o uso atual de analises do usuario:

- Nova funcao `fetchAnalysisUsage` que consulta `strategic_usage_logs` contando quantas vezes o endpoint `analyze-menu-performance` foi usado pelo usuario no mes atual (para basic/pro) ou total (para free)
- Tambem consulta `plan_features` para pegar o `usage_limit` do plano do usuario
- Retorna `{ used: number, limit: number, plan: string }`
- Chamar essa funcao no mount e apos cada analise bem-sucedida

Novo estado exposto:
```text
analysisUsage: { used: number; limit: number; plan: string } | null
```

### Arquivo 4: `src/components/menu-mirror/MenuPerformanceDashboard.tsx`

Receber nova prop `analysisUsage` e exibir sutilmente:

- Quando nao tem analise ainda (tela inicial com botao "Analisar Cardapio"): mostrar abaixo do botao um texto pequeno como "Voce tem X de Y analises disponiveis" em `text-xs text-muted-foreground`
- Quando ja tem analise (tela com score): mostrar no rodape do card principal, ao lado do botao "Analisar novamente", o texto "X de Y analises usadas" com uma mini barra de progresso
- Para free: "1 de 1 analise (unica)" ou "Analise gratuita utilizada"
- Para basic: "3 de 5 analises usadas este mes"
- Para pro: "7 de 10 analises usadas este mes"
- Quando o limite esta proximo (>80%), a cor muda para amarelo/laranja como alerta visual sutil

### Arquivo 5: `src/pages/MenuMirror.tsx`

- Passar `analysisUsage` do hook para o `MenuPerformanceDashboard`
- Chamar `fetchAnalysisUsage` no useEffect inicial

### Arquivo 6: `src/components/admin/PlanLimitsTable.tsx`

Atualizar a tabela de limites do admin para refletir os valores corretos:
- Analise de cardapio: Free = "1 (unica)", Basic = "5/mes", Pro = "10/mes"
- Lojas: Free = "1", Basic = "1", Pro = "3"
- Adicionar nota: "Limites sao por conta, nao por loja"

## Sobre o limite por conta (nao por loja)

O sistema ja funciona assim no backend: a funcao `check_and_increment_usage` conta por `user_id`, independente de qual loja o usuario esta usando. Nao e necessario nenhuma mudanca no backend. A unica acao e deixar isso claro na interface:
- Na landing page: "Ate 3 lojas (limites por conta)"
- No dashboard de analise: O contador mostra o total da conta, nao da loja ativa
