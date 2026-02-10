
# Plano: Completar Implementacao dos Combos Inteligentes (BETA)

## Diagnostico Atual

Apos auditoria completa, o modulo ja possui:
- **Backend (Edge Function `generate-combo`)**: Completo - IA com tool calling, validacao financeira, fail-safe de margem minima, controle de uso por plano
- **Banco de dados**: 3 tabelas (`combos`, `combo_items`, `combo_generation_usage`) com RLS corretas
- **Frontend (`Combos.tsx`)**: Pagina funcional com seletor de objetivo, listagem, expansao de detalhes, exclusao
- **Hook (`useCombos.ts`)**: Logica de estado, geracao, exclusao e controle de limites
- **Planos configurados**: Free (1), Basico (3/mes), Pro (5/mes)

## Lacunas Identificadas

### 1. Itens do combo nao sao carregados na listagem
O `fetchCombos` faz `select("*")` apenas na tabela `combos` -- os itens (`combo_items`) nunca sao buscados do banco. Por isso, ao expandir um combo salvo, aparece "Detalhes dos itens nao disponiveis".

### 2. Painel Admin de Combos inexistente
Nao existe nenhuma aba/secao no AdminDashboard para visualizar uso de IA por usuario, historico de combos, objetivos escolhidos ou definir limites personalizados.

### 3. Edge Function `admin-stats` nao inclui metricas de combos
A funcao retorna apenas metricas de usuarios e MRR, sem dados sobre uso de combos.

### 4. Upsell de combos extras nao implementado
O spec menciona "R$ 9,99 = 3 combos extras" mas nao ha nenhum mecanismo para isso.

### 5. Store filter ausente no fetch
O `fetchCombos` nao filtra por `activeStore`, mostrando combos de todas as lojas.

---

## Plano de Implementacao

### Fase 1 -- Corrigir carregamento de itens do combo

**Arquivo: `src/hooks/useCombos.ts`**
- Apos buscar combos, fazer uma segunda query em `combo_items` filtrando pelos `combo_id` retornados
- Associar os itens a cada combo no estado local
- Isso corrige o problema de "Detalhes nao disponiveis" nos combos ja salvos

### Fase 2 -- Filtro por loja ativa

**Arquivo: `src/hooks/useCombos.ts`**
- Adicionar `activeStore` como dependencia do `fetchCombos`
- Se houver `activeStore.id`, filtrar combos e usage por `store_id`

### Fase 3 -- Painel Admin de Combos

**Arquivo: `supabase/functions/admin-stats/index.ts`**
- Adicionar ao response metricas de combos:
  - Total de combos gerados (geral e este mes)
  - Uso por usuario (top usuarios geradores)
  - Distribuicao por objetivo
  - Combos simulacao vs draft vs publicado

**Novo arquivo: `src/components/admin/CombosDashboard.tsx`**
- Componente com:
  - KPIs: total combos gerados, uso IA este mes, media por usuario
  - Tabela de uso por usuario (email, plano, combos gerados, ultimo uso)
  - Grafico de distribuicao por objetivo (pie chart)
  - Historico de combos recentes com objetivo, status e data

**Arquivo: `src/pages/AdminDashboard.tsx`**
- Adicionar nova aba "Combos IA" no TabsList
- Renderizar `CombosDashboard` no TabsContent correspondente

**Arquivo: `src/components/admin/AdminLayout.tsx`**
- Adicionar item de navegacao "Combos IA" com icone Sparkles na sidebar

### Fase 4 -- Preparacao para Upsell (sem pagamento)

**Arquivo: `src/pages/Combos.tsx`**
- Quando `!canGenerate`, exibir card de upsell com texto "Desbloqueie 3 combos extras por R$ 9,99" e botao desabilitado "Em breve"
- Isso deixa o codigo preparado para integracao futura com Stripe sem implementar cobranca agora

---

## Detalhes Tecnicos

### Query de itens (Fase 1)
```typescript
// Apos buscar combos
const comboIds = data.map(c => c.id);
if (comboIds.length > 0) {
  const { data: items } = await supabase
    .from("combo_items")
    .select("*")
    .in("combo_id", comboIds);
  // Agrupar itens por combo_id e mesclar
}
```

### Metricas admin (Fase 3)
```sql
-- Queries via service_role no admin-stats
SELECT objective, count(*) FROM combos GROUP BY objective;
SELECT user_id, count(*) FROM combo_generation_usage 
  WHERE created_at >= start_of_month GROUP BY user_id;
```

### Arquivos criados
| Arquivo | Descricao |
|---------|-----------|
| `src/components/admin/CombosDashboard.tsx` | Painel admin de combos |

### Arquivos modificados
| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useCombos.ts` | Fetch de items + filtro por store |
| `supabase/functions/admin-stats/index.ts` | Metricas de combos |
| `src/pages/AdminDashboard.tsx` | Nova aba "Combos IA" |
| `src/components/admin/AdminLayout.tsx` | Nav item "Combos IA" |
| `src/pages/Combos.tsx` | Card de upsell preparatorio |

### Sem alteracoes de banco de dados
Todas as tabelas e policies ja existem e estao corretas. Nenhuma migration necessaria.
