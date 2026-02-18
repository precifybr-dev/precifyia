

# Melhorias Recomendadas para o Precify

Apos analisar o codigo inteiro, identifiquei **5 melhorias de alto impacto** organizadas por prioridade.

---

## 1. Dashboard Duplica Sidebar (Codigo Morto)

**Problema**: O `Dashboard.tsx` tem uma sidebar completa inline (~170 linhas) duplicando o `AppSidebar.tsx` que ja existe como componente reutilizavel. Todas as outras paginas (BusinessArea, etc.) usam `<AppSidebar />`, mas o Dashboard reimplementa tudo.

**Impacto**: Codigo duplicado, navegacao inconsistente (ex: Dashboard nao tem "Meu Plano" no menu), manutencao dobrada.

**Solucao**: Substituir a sidebar inline do Dashboard pelo componente `<AppSidebar />`, igual as demais paginas. Reduz ~150 linhas.

---

## 2. "Trial: 7 dias restantes" Hardcoded

**Problema**: Na linha 550-554 do Dashboard, o badge de trial esta fixo: `"Trial: 7 dias restantes"`. Nao calcula nada. Todo usuario ve "7 dias" independente de quando criou a conta.

**Impacto**: Informacao enganosa para o usuario.

**Solucao**: Calcular dias restantes com base em `profile.created_at` + periodo trial, ou ocultar se o usuario ja tem plano pago.

---

## 3. BusinessArea.tsx com Regime Tributario Duplicado (Regressao)

**Problema**: Na ultima limpeza, removemos `tax_regime` e `monthly_revenue` do formulario de edicao, porem no modo visualizacao (linhas 430-432) ainda aparece o card "Regime Tributario" e o destaque "Faturamento Mensal" (linhas 400-418) — que ja existem nos blocos dedicados `TaxesAndFeesBlock` e `MonthlyRevenueBlock`.

**Impacto**: O usuario ve a mesma informacao duas vezes na mesma pagina.

**Solucao**: Remover o card "Regime Tributario" e o bloco "Faturamento Mensal" do modo visualizacao das Configuracoes, mantendo apenas nos blocos dedicados.

---

## 4. Seguranca: Leaked Password Protection Desabilitada

**Problema**: O linter de seguranca detectou que a protecao contra senhas vazadas esta desabilitada. Isso significa que usuarios podem usar senhas que ja apareceram em vazamentos de dados conhecidos.

**Impacto**: Risco de seguranca — contas comprometidas por ataques de credential stuffing.

**Solucao**: Habilitar leaked password protection nas configuracoes de autenticacao.

---

## 5. PricingSummaryPanel.tsx Muito Grande (864 linhas)

**Problema**: O componente de precificacao tem 864 linhas em um unico arquivo. Contem logica de calculo, formatacao, UI de Loja, UI de iFood, promocao, CMV, custos de producao — tudo junto.

**Impacto**: Dificil de manter, testar e debugar. Qualquer mudanca em um bloco arrisca quebrar outro.

**Solucao**: Extrair em subcomponentes:
- `PricingInputsCard` (preco, CMV, perda)
- `PricingMarginsCard` (margens, sugestoes)
- `PricingIfoodCard` (calculadora iFood)
- `PricingProfitCard` (lucro liquido Loja vs iFood)
- `PricingPromotionCard` (desconto)

---

## Secao Tecnica — Arquivos Afetados

| # | Melhoria | Arquivos | Complexidade |
|---|----------|----------|--------------|
| 1 | Remover sidebar duplicada | `src/pages/Dashboard.tsx` | Baixa |
| 2 | Trial dinamico | `src/pages/Dashboard.tsx`, `src/contexts/StoreContext.tsx` | Baixa |
| 3 | Remover duplicatas visualizacao | `src/pages/BusinessArea.tsx` | Baixa |
| 4 | Leaked password protection | Configuracao de auth | Baixa |
| 5 | Refatorar PricingSummaryPanel | `src/components/recipes/PricingSummaryPanel.tsx` + 5 novos | Media |

### Recomendacao de Ordem

Prioridade 1 (rapido, alto impacto): Items 1, 2, 3
Prioridade 2 (seguranca): Item 4
Prioridade 3 (qualidade de codigo): Item 5

