

## Plano: Motor de Insights de Delivery (Agente de Diagnóstico no Menu Performance Score)

### Resumo

Criar uma tabela `delivery_insights` com regras de especialistas, um motor de avaliação client-side que cruza dados do cardápio com essas regras, e exibir os diagnósticos como uma nova seção dentro do `MenuPerformanceDashboard`.

---

### 1. Banco de Dados

**Migração** — criar tabela `delivery_insights`:

```sql
CREATE TYPE public.insight_categoria AS ENUM ('CMV','precificacao','cardapio','ticket_medio','operacao','logistica','cancelamentos');
CREATE TYPE public.insight_tipo_regra AS ENUM ('threshold_min','threshold_max','intervalo_recomendado','regra_operacional','boas_praticas');
CREATE TYPE public.insight_impacto AS ENUM ('baixo','medio','alto');

CREATE TABLE public.delivery_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text TEXT NOT NULL,
  categoria insight_categoria NOT NULL,
  tipo_regra insight_tipo_regra NOT NULL,
  valor_min NUMERIC,
  valor_max NUMERIC,
  descricao_regra TEXT NOT NULL,
  impacto insight_impacto NOT NULL DEFAULT 'medio',
  tags TEXT[] DEFAULT '{}',
  fonte TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON public.delivery_insights FOR SELECT TO authenticated USING (true);
```

**Seed data** (via insert tool) — popular com ~15 regras iniciais cobrindo as categorias principais:
- CMV > 35% → alerta alto
- Margem < 15% → alerta alto  
- Lucro líquido ≤ 0 → alerta alto (risco de prejuízo)
- Cardápio > 60 itens → alerta médio
- Ticket médio < R$20 → alerta médio
- Preço abaixo de R$10 → alerta baixo (precificação)
- E outras regras operacionais e de boas práticas

---

### 2. Hook: `useDeliveryInsights`

Novo hook em `src/hooks/useDeliveryInsights.ts`:
- Busca regras da tabela `delivery_insights` (cache com react-query)
- Recebe `menuData.items` como input
- Motor de avaliação local (client-side, sem Edge Function):
  - Para cada item: calcula `cmv_produto`, `margem_produto`, `lucro_liquido` usando preço e custo estimado
  - Compara contra regras por categoria
  - Para métricas agregadas (qtd itens, ticket médio): avalia regras de `cardapio` e `ticket_medio`
- Retorna array de diagnósticos no formato:
  ```ts
  { problema_tipo, produto, nivel_risco, explicacao, recomendacao }
  ```

**Nota**: Como os itens do cardápio iFood só têm `name`, `price`, `category` (sem custo), o motor usará heurísticas configuráveis (ex: CMV estimado = 35% do preço) e taxa marketplace padrão do perfil do usuário. Isso será comunicado como estimativa.

---

### 3. UI: Seção "Diagnóstico Financeiro" no MenuPerformanceDashboard

Adicionar nova seção dentro do bloco `showDetails` do dashboard existente, **após** os pilares e **antes** do re-analyze button:

- Card com ícone 🔍 "Diagnóstico Financeiro do Cardápio"
- Lista de problemas detectados, cada um com:
  - Badge de risco (alto/médio/baixo) com cores (vermelho/laranja/amarelo)
  - Nome do produto afetado
  - Explicação curta
  - Recomendação prática
- Se nenhum problema: mensagem positiva "Nenhum alerta crítico detectado"
- Disclaimer: "Análise baseada em estimativas de custo. Cadastre seus produtos para diagnóstico preciso."

---

### 4. Integração

- `MenuMirror.tsx`: passar `menuData` para o dashboard
- `MenuPerformanceDashboard.tsx`: 
  - Receber `menuItems` como prop adicional
  - Chamar `useDeliveryInsights(menuItems)` internamente
  - Renderizar seção de diagnóstico apenas quando `analysis` existe e `showDetails` está aberto

---

### Arquivos Afetados

| Ação | Arquivo |
|------|---------|
| Criar | `src/hooks/useDeliveryInsights.ts` |
| Migração | Tabela `delivery_insights` + enums + RLS + seed data |
| Editar | `src/components/menu-mirror/MenuPerformanceDashboard.tsx` |
| Editar | `src/pages/MenuMirror.tsx` |

