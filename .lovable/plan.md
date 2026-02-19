

# Melhorar modal de Upgrade para mostrar todos os planos

## Problema atual

O modal `PlanUpgradePrompt` mostra apenas o proximo plano (Gratuito -> Basico OU Basico -> Pro), sem opcao de comparar ou escolher outro plano. O usuario espera ver todos os planos disponiveis com seus beneficios lado a lado.

## Solucao

Redesenhar o `PlanUpgradePrompt` para exibir todos os planos disponiveis (superiores ao atual) em formato de cards lado a lado, com a tabela de comparacao detalhada integrada. O modal reutilizara o componente `PlanComparisonTable` ja existente e buscara os planos do banco de dados via `usePublicPricing`.

## O que muda para o usuario

- Ao clicar em "Fazer Upgrade", o modal abre maior (max-w-4xl) com cards de todos os planos disponiveis
- O plano atual aparece marcado como "Seu plano" (desabilitado)
- Planos superiores tem botao "Escolher plano"
- Abaixo dos cards, um botao "Comparar todos os beneficios" expande a tabela de comparacao detalhada (mesmo formato da landing page)
- O plano recomendado (popular) tem destaque visual

## Detalhes tecnicos

### Arquivo: `src/components/upsell/PlanUpgradePrompt.tsx`

Alteracoes principais:

1. Importar `usePublicPricing` para buscar planos do banco (com fallback local igual a PricingSection)
2. Importar `PlanComparisonTable` para comparacao detalhada
3. Expandir o DialogContent para `sm:max-w-4xl`
4. Renderizar grid de cards (1 coluna mobile, 3 colunas desktop) com todos os planos
5. Cada card mostra: nome, preco, features principais, badge "Seu plano" ou botao "Escolher"
6. Toggle para expandir/colapsar a tabela de comparacao completa
7. Botao "Escolher plano" navega para `/app/plan` ou abre link de pagamento (por enquanto fecha o modal)

### Estrutura do novo layout

```text
+------------------------------------------+
| Escolha seu plano                        |
| Desbloqueie todo o potencial do Precify  |
+------------------------------------------+
| [Teste]    | [Essencial]  | [Pro]        |
| Gratis     | R$ 97/mes    | R$ 147/mes   |
| Seu plano  | Escolher     | + Popular    |
|            |              | Escolher     |
+------------------------------------------+
| v Comparar todos os beneficios           |
| [Tabela de comparacao expandivel]        |
+------------------------------------------+
| Agora nao                               |
+------------------------------------------+
```

### Dados

Os planos vem de `usePublicPricing()` (mesmo hook da landing page), que busca da tabela `pricing_plans` com fallback hardcoded. Nenhuma mudanca no banco de dados e necessaria.

### Arquivos alterados

1. **`src/components/upsell/PlanUpgradePrompt.tsx`** -- reescrever para mostrar todos os planos com comparacao

Nenhuma migration SQL necessaria. Nenhuma edge function alterada.
