
# Atualizar Backup e Exportacao de Dados

## Diagnostico: O que esta desatualizado

### Backup do Usuario (backup-restore)

O backup exporta/importa dados do usuario para ele restaurar em outra conta ou loja. Foram encontradas **6 lacunas**:

| Problema | Impacto | Risco |
|----------|---------|-------|
| `fixed_expenses` nao exporta `cost_type`, `sharing_group_id`, `shared_store_ids` | Despesas compartilhadas perdem configuracao de compartilhamento ao restaurar | **Alto** |
| `stores` nao sao exportadas (nome, business_type, monthly_revenue, default_cmv) | Informacoes da loja se perdem, impossivel restaurar multi-loja | **Alto** |
| `sharing_groups` e `sharing_group_stores` nao sao exportados | Grupos de compartilhamento nao podem ser recriados | **Alto** |
| `cost_allocations` nao sao exportadas | Historico de alocacao de custos se perde | Medio |
| `cmv_periodos` e `cmv_categorias` nao sao exportados | Historico de CMV se perde | Medio |
| `topo_cardapio_simulacoes` nao sao exportadas | Simulacoes de cardapio se perdem | Baixo |

### Exportacao Admin (admin-export)

O admin export gera CSVs para auditoria. Foram encontradas **3 lacunas**:

| Problema | Impacto |
|----------|---------|
| Lista de tabelas no fallback do modulo `database` esta desatualizada (faltam ~18 tabelas) | Admin nao ve todas as tabelas do sistema |
| Lista de Edge Functions esta desatualizada | Faltam funcoes recentes no CSV |
| Schema SQL (known tables) tambem desatualizado | DDL gerado fica incompleto |

---

## Plano de Correcao

### Fase 1 -- Backup do Usuario (backup-restore/index.ts)

**1.1 Adicionar campos de compartilhamento em fixed_expenses**

Incluir `cost_type`, `sharing_group_id`, `shared_store_ids` no EXPORT_FIELDS de fixed_expenses. Na importacao, tratar para que despesas compartilhadas sejam reconvertidas corretamente.

**1.2 Exportar/importar stores**

Adicionar `stores` ao backup com campos: `name`, `business_type`, `is_default`, `monthly_revenue`, `default_cmv`, `ifood_url`. Na importacao, recriar as lojas do usuario (ou mapear para existentes).

**1.3 Exportar/importar sharing_groups e sharing_group_stores**

Incluir dados de grupos de compartilhamento. Na importacao, recriar grupos apenas se houver multiplas lojas.

**1.4 Exportar/importar cost_allocations**

Exportar alocacoes por `expense_id` (referenciando nome da despesa). Na importacao, reconectar apos inserir fixed_expenses.

**1.5 Exportar/importar CMV (cmv_periodos + cmv_categorias)**

Exportar periodos CMV com suas categorias aninhadas. Na importacao, recriar com referencia a loja correta.

**1.6 Exportar/importar topo_cardapio_simulacoes**

Incluir simulacoes de cardapio no backup.

**1.7 Incrementar SCHEMA_VERSION para "2.0.0"**

Com fallback para aceitar backups "1.0.0" (importa o que existir, ignora o que nao tiver).

### Fase 2 -- Admin Export (admin-export/index.ts)

**2.1 Atualizar lista de tabelas no modulo database**

Adicionar tabelas faltantes: `marketing_campaigns`, `monetization_settings`, `payment_links`, `pricing_anchoring_config`, `pricing_audit_log`, `pricing_phrases`, `pricing_plans`, `rate_limit_global`, `risk_flags`, `support_abuse_alerts`, `support_session_logs`, `ticket_messages`, `ticket_notes`, `topo_cardapio_simulacoes`, `university_modules`, `user_lesson_progress`, `user_sessions`.

**2.2 Atualizar lista de Edge Functions**

Sincronizar com config.toml atual.

**2.3 Atualizar known tables do schema_sql**

Mesma lista atualizada da 2.1, para que o DDL gerado seja completo.

---

## Detalhes Tecnicos

### backup-restore/index.ts -- Alteracoes

```text
EXPORT_FIELDS atualizado:
  fixed_expenses: ["name", "monthly_value", "store_id", "cost_type", "sharing_group_id", "shared_store_ids"]
  
Novas entradas:
  stores: ["name", "business_type", "is_default", "monthly_revenue", "default_cmv", "ifood_url"]
  cmv_periodos: ["mes", "ano", "modo", "estoque_inicial", "compras", "estoque_final", "ajustes", 
                  "cmv_calculado", "cmv_percentual", "faturamento_liquido", "meta_definida", 
                  "meta_automatica", "onboarding_concluido", "store_id"]
  cmv_categorias: ["categoria", "estoque_inicial", "compras", "estoque_final", "ajustes",
                    "cmv_categoria", "cmv_percentual_categoria"]
  topo_cardapio_simulacoes: ["estrategia_aplicada", "itens_simulados", "explicacao", "store_id"]
  cost_allocations: ["store_id", "percentage", "allocated_value", "reference_month"]
```

A funcao `handleExport` sera expandida para buscar essas tabelas adicionais.

A funcao `insertData` sera expandida para importar na ordem correta:
1. Stores (primeiro, para ter os IDs)
2. Sharing groups + sharing_group_stores
3. Ingredientes, receitas, etc. (existente)
4. Fixed expenses com campos de compartilhamento
5. Cost allocations (referenciando expenses importadas)
6. CMV periodos + categorias
7. Simulacoes

Compatibilidade: backups v1.0.0 continuam sendo importados normalmente (campos ausentes sao ignorados).

### admin-export/index.ts -- Alteracoes

Atualizar arrays hardcoded:
- `tableNames` no fallback do modulo database: adicionar 18 tabelas faltantes
- `functions` no modulo edge_functions: sincronizar com config.toml
- `knownTables` no handler schema_sql: mesma atualizacao

### Frontend (BackupRestore.tsx)

Adicionar labels para novas tabelas no LABEL_MAP:
- `stores`: "Lojas"
- `cmv_periodos`: "Periodos CMV"
- `cmv_categorias`: "Categorias CMV"
- `cost_allocations`: "Alocacoes de Custos"
- `topo_cardapio_simulacoes`: "Simulacoes de Cardapio"

---

## Arquivos Alterados

1. `supabase/functions/backup-restore/index.ts` -- expandir export/import com tabelas faltantes
2. `supabase/functions/admin-export/index.ts` -- atualizar listas de tabelas e functions
3. `src/pages/BackupRestore.tsx` -- adicionar labels para novos itens no preview

## Riscos

| Mudanca | Risco | Mitigacao |
|---------|-------|-----------|
| Novo schema_version 2.0.0 | Baixo | Aceita backups 1.0.0 via fallback |
| Exportar/importar stores | Medio | Mapeia por nome, nao sobrescreve existentes |
| Exportar sharing_groups | Medio | So recria se ambas as lojas existirem |
| Mais dados no backup | Baixo | Campos opcionais, import ignora se ausentes |
