
# Nova Aba: Controle de Custos Cloud & IA

## Objetivo
Criar uma aba "Custos Cloud & IA" no painel administrativo que permita visualizar e controlar todos os gastos gerados por interacoes dos usuarios com a plataforma (chamadas de IA, funcoes backend, etc.).

## Fonte de Dados
A tabela `strategic_usage_logs` ja registra todas as chamadas de IA com:
- `user_id` - quem executou
- `endpoint` - qual funcao (generate-combo, parse-ifood-menu, analyze-menu-performance, etc.)
- `tokens_used` - tokens consumidos
- `created_at` - quando ocorreu

## O Que Sera Criado

### 1. Funcao SQL para agregar custos
Uma RPC `get_cloud_cost_metrics` que retorna:
- Custo total estimado por endpoint (baseado em tokens)
- Custo por usuario (quanto cada usuario gera de custo)
- Custo medio de onboarding (novo usuario: cadastro + importacao de cardapio + primeiro combo)
- Evolucao diaria de custos
- Top 10 usuarios mais caros

**Tabela de precos estimados por endpoint** (configuravel):
| Endpoint | Custo estimado por 1K tokens |
|----------|------------------------------|
| generate-combo | $0.01 |
| generate-menu-strategy | $0.01 |
| parse-ifood-menu | $0.01 |
| analyze-menu-performance | $0.01 |
| analyze-spreadsheet-columns | $0.01 |

### 2. Componente `CloudCostsDashboard.tsx`
Nova aba no admin com as seguintes secoes:

**KPIs principais:**
- Custo total no periodo (Cloud + IA)
- Custo medio por usuario
- Custo medio de aquisicao tecnica (CAC tecnico - quanto custa um novo usuario em infra)
- Total de chamadas de IA no periodo

**Graficos:**
- Evolucao diaria de custos (AreaChart)
- Custo por endpoint (BarChart horizontal - qual feature gasta mais)
- Distribuicao de custo por tipo (PieChart)

**Tabelas:**
- Top 10 usuarios que mais consomem (com email, plano, total tokens, custo estimado)
- Detalhamento por endpoint (chamadas, tokens, custo, media por chamada)
- Custo do onboarding: estimativa de quanto custa cada etapa do novo usuario

**Filtros:**
- Periodo (7, 14, 30, 60 dias)
- Por endpoint especifico

### 3. Hook `useCloudCosts.ts`
Hook que busca os dados via RPC e calcula metricas derivadas como custos em USD.

### 4. Integracao no AdminDashboard
- Nova aba "Custos" com icone `Server` no `TabsList`
- Novo item no sidebar do `AdminLayout` (masterOnly)

## Detalhes Tecnicos

### Migration SQL
```sql
-- Funcao que agrega metricas de custo
CREATE OR REPLACE FUNCTION get_cloud_cost_metrics(days_back integer DEFAULT 30)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'by_endpoint', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT endpoint, count(*) as calls, sum(tokens_used) as total_tokens,
               count(distinct user_id) as unique_users
        FROM strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY endpoint ORDER BY total_tokens DESC
      ) t
    ),
    'by_user', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT s.user_id, p.email, p.business_name, p.user_plan,
               count(*) as calls, sum(s.tokens_used) as total_tokens
        FROM strategic_usage_logs s
        LEFT JOIN profiles p ON p.user_id = s.user_id
        WHERE s.created_at >= now() - (days_back || ' days')::interval
        GROUP BY s.user_id, p.email, p.business_name, p.user_plan
        ORDER BY total_tokens DESC LIMIT 20
      ) t
    ),
    'daily', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT date(created_at) as day, count(*) as calls,
               sum(tokens_used) as total_tokens
        FROM strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY date(created_at) ORDER BY day
      ) t
    ),
    'totals', (
      SELECT row_to_json(t)
      FROM (
        SELECT count(*) as total_calls, sum(tokens_used) as total_tokens,
               count(distinct user_id) as total_users
        FROM strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Arquivos a criar/modificar:
1. **Criar** `src/hooks/useCloudCosts.ts` - Hook para buscar e processar dados
2. **Criar** `src/components/admin/CloudCostsDashboard.tsx` - Componente da aba
3. **Modificar** `src/pages/AdminDashboard.tsx` - Adicionar nova aba "Custos"
4. **Modificar** `src/components/admin/AdminLayout.tsx` - Adicionar item no sidebar

### Calculo de Custos
- Preco base: $0.01 por 1K tokens (Gemini Flash - modelo mais usado)
- Custos Cloud (DB, Functions, Auth): estimativa fixa de ~$0.001 por chamada de funcao
- O dashboard exibira valores em USD para facilitar comparacao com os limites do Lovable ($25 Cloud + $1 AI)
