

# Plano: Sistema de Backup e Restore de Dados

## Resumo

Implementar um sistema completo de exportacao e importacao de dados do usuario, processado inteiramente no backend via Edge Function. O usuario podera baixar um arquivo `.precify-backup` contendo todos os seus dados cadastrais (sem dados calculados), e restaurar esses dados com opcoes de substituir ou adicionar, apos uma tela de pre-visualizacao e confirmacao explicita.

---

## Dados incluidos no backup

Apenas dados cadastrados pelo usuario (dados de entrada):

| Tabela | Campos exportados (somente entrada) |
|--------|-------------------------------------|
| `ingredients` | name, unit, purchase_price, purchase_quantity, correction_factor, color, code, store_id |
| `recipes` | name, servings, cmv_target, selling_price, ifood_selling_price, store_id |
| `recipe_ingredients` | ingredient_id (mapeado por nome), quantity, unit, recipe_id (mapeado por nome) |
| `sub_recipes` | name, unit, yield_quantity, store_id |
| `sub_recipe_ingredients` | ingredient_id (mapeado), quantity, unit, sub_recipe_id (mapeado) |
| `beverages` | name, unit, purchase_price, purchase_quantity, selling_price, cmv_target, category, color, code, ifood_selling_price, store_id |
| `combos` | name, description, objective, status, store_id |
| `combo_items` | item_name, item_type, combo_id (mapeado), role |
| `fixed_costs` | name, value_per_item, store_id |
| `variable_costs` | name, value_per_item, store_id |
| `fixed_expenses` | name, monthly_value, store_id |
| `variable_expenses` | name, monthly_value, store_id |
| `business_taxes` | tax_regime, tax_percentage, notes, store_id |
| `card_fees` | payment_type, fee_percentage, notes, store_id |
| `monthly_revenues` | month, year, value, store_id |
| `profiles` | business_name, business_type, default_cmv, cost_limit_percent, tax_regime, ifood_* configs |

**Excluidos**: Campos calculados (total_cost, cost_per_serving, suggested_price, unit_price, unit_cost, etc.), usuarios, senhas, billing, logs, calculation_history.

---

## Arquitetura

### Edge Function: `backup-restore`

Uma unica Edge Function com dois modos de operacao via query param `?action=export` ou `?action=import`.

**Exportacao (GET ?action=export)**:
1. Autentica usuario via JWT
2. Busca todos os dados do usuario (filtrado por user_id e opcionalmente store_id)
3. Monta objeto JSON com metadados (schema_version, exported_at, user_id, store_id)
4. Remove campos calculados e IDs internos
5. Retorna o JSON como download

**Importacao (POST ?action=import)**:
- **Modo preview** (`?action=import&preview=true`): Recebe o arquivo, valida estrutura, retorna contagem de itens sem modificar nada
- **Modo executar** (`?action=import&preview=false`): Recebe arquivo + modo (replace/merge), executa dentro de transacao atomica

### Formato do arquivo

```json
{
  "format": "precify-backup",
  "schema_version": "1.0.0",
  "exported_at": "2026-02-10T...",
  "user_id": "uuid",
  "store_id": "uuid | null",
  "store_name": "Nome da Loja",
  "data": {
    "profile": { ... },
    "ingredients": [ ... ],
    "recipes": [ ... ],
    "recipe_ingredients": [ ... ],
    "sub_recipes": [ ... ],
    "sub_recipe_ingredients": [ ... ],
    "beverages": [ ... ],
    "combos": [ ... ],
    "combo_items": [ ... ],
    "fixed_costs": [ ... ],
    "variable_costs": [ ... ],
    "fixed_expenses": [ ... ],
    "variable_expenses": [ ... ],
    "business_taxes": [ ... ],
    "card_fees": [ ... ],
    "monthly_revenues": [ ... ]
  }
}
```

### Seguranca

- JWT obrigatorio para exportar e importar
- user_id derivado exclusivamente do token JWT (nunca do payload)
- Na importacao, o `user_id` do arquivo e comparado com o usuario logado -- se nao bater, a operacao e bloqueada
- Validacao de `schema_version` -- se incompativel, retorna erro claro
- Payload sanitizado: apenas campos da whitelist sao aceitos (protecao contra mass assignment)
- Toda operacao de import e export e registrada no `data_audit_log`
- Import em modo `replace` usa transacao: se qualquer etapa falhar, tudo e revertido

---

## Frontend

### Pagina de Backup (`src/pages/BackupRestore.tsx`)

Acessivel via menu lateral do Dashboard. Layout simples com duas secoes:

**Secao Exportar**:
- Botao "Fazer backup dos meus dados"
- Spinner durante geracao
- Download automatico do arquivo `.precify-backup`
- Mensagem de sucesso com data/hora

**Secao Importar**:
- Area de upload (drag & drop ou clique)
- Aceita apenas `.precify-backup` e `.json`
- Apos upload, chama endpoint de preview
- Tela de pre-visualizacao mostrando:
  - Quantidade de insumos, receitas, bebidas, sub-receitas, combos, custos, despesas
  - Aviso: "Os dados calculados (precos sugeridos, CMV, etc.) serao recalculados automaticamente apos a importacao"
- Selecao de modo:
  - "Substituir tudo" (apaga dados atuais e insere novos)
  - "Adicionar sem sobrescrever" (insere apenas itens novos, baseado no nome)
- Modal de confirmacao com aviso de risco e campo de digitacao "RESTAURAR" para modo replace
- Timer de 3 segundos no botao de confirmacao (padrao do sistema)

### Hook (`src/hooks/useBackupRestore.ts`)

- `exportBackup(storeId?)` -- chama Edge Function, gera download
- `previewImport(file)` -- envia arquivo para preview, retorna contagem
- `executeImport(file, mode)` -- executa importacao real
- Estados: isExporting, isImporting, preview, error

### Navegacao

- Novo item "Backup" no menu lateral com icone `HardDrive` ou `Database`
- Rota `/app/backup` registrada em `App.tsx`

---

## Implementacao passo a passo

### Fase 1 -- Tabela de log (Migration)

Nenhuma tabela nova necessaria. A tabela `data_audit_log` ja existe e sera utilizada para registrar operacoes de backup/restore com actions `backup_export` e `backup_import`.

### Fase 2 -- Edge Function `backup-restore`

Arquivo: `supabase/functions/backup-restore/index.ts`

Responsabilidades:
- CORS headers padrao
- Autenticacao via JWT
- Rota `action=export`: serializa dados do usuario, remove campos calculados
- Rota `action=import&preview=true`: valida arquivo, retorna contagem
- Rota `action=import&preview=false`: valida, executa insert/replace em transacao
- Rate limiting via `check_rate_limit` (max 5 exports/hora, 3 imports/hora)
- Log no `data_audit_log` para cada operacao

### Fase 3 -- Hook frontend

Arquivo: `src/hooks/useBackupRestore.ts`

### Fase 4 -- Pagina de Backup

Arquivo: `src/pages/BackupRestore.tsx`

Componentes utilizados: Card, Button, Switch, AlertDialog (confirmacao), Progress, Badge

### Fase 5 -- Navegacao

- `src/pages/Dashboard.tsx`: adicionar item "Backup" no array `navItems`
- `src/App.tsx`: registrar rota `/app/backup`

---

## Detalhes tecnicos

### Campos excluidos da exportacao (calculados pelo sistema)

| Tabela | Campos excluidos |
|--------|-----------------|
| `ingredients` | unit_price (calculado) |
| `recipes` | total_cost, cost_per_serving, suggested_price, calculation_version |
| `sub_recipes` | total_cost, unit_cost |
| `combos` | combo_price, total_cost, individual_total_price, margin_percent, estimated_profit, ai_raw_response |
| `combo_items` | cost, individual_price, is_bait |

### Logica de import "Substituir tudo"

1. Validar schema_version
2. Validar user_id do arquivo == user_id do JWT
3. Dentro de transacao (via service_role):
   - Deletar: combo_items, combos, recipe_ingredients, recipes, sub_recipe_ingredients, sub_recipes, beverages, ingredients, fixed_costs, variable_costs, fixed_expenses, variable_expenses, business_taxes, card_fees, monthly_revenues (do user/store)
   - Inserir na ordem correta (respeitando foreign keys): ingredients, sub_recipes, sub_recipe_ingredients, recipes, recipe_ingredients, beverages, combos, combo_items, custos, despesas, taxes, fees, revenues
   - Atualizar profile (business configs)
4. Registrar log

### Logica de import "Adicionar"

1. Mesma validacao
2. Para cada tabela, inserir apenas itens cujo `name` nao existe ainda
3. Para relacoes (recipe_ingredients), resolver por nome do insumo/receita
4. Registrar log com contagem de itens adicionados vs ignorados

### Arquivos criados

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/backup-restore/index.ts` | Edge Function principal |
| `src/hooks/useBackupRestore.ts` | Hook de backup/restore |
| `src/pages/BackupRestore.tsx` | Pagina de Backup |

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Rota `/app/backup` |
| `src/pages/Dashboard.tsx` | Item "Backup" no menu lateral |
| `supabase/config.toml` | verify_jwt = false para backup-restore |

