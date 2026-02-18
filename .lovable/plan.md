

# Modulo de Compartilhamento de Custos (Plano Pro)

## Resumo

Implementar o sistema de compartilhamento inteligente de despesas fixas entre lojas que dividem estrutura fisica (ex: dark kitchens). O MVP usa apenas divisao igualitaria automatica, com arquitetura preparada para divisao manual futura.

---

## Escopo MVP

- Apenas **divisao igualitaria** (valor / numero de lojas)
- Recalculo automatico ao adicionar/remover loja ou alterar despesa
- Historico mensal imutavel (cost_allocations)
- Fluxo de criacao de loja com pergunta "compartilha estrutura?"
- Visualizacao de parcela por loja na Area de Negocio
- Divisao manual e outros criterios ficam para versao futura

---

## 1. Modelagem de Banco de Dados

### Tabela: `sharing_groups`
```
id              uuid PK default gen_random_uuid()
user_id         uuid NOT NULL (dono do grupo)
name            text NOT NULL
division_type   text NOT NULL default 'equal' CHECK (equal | manual)
created_at      timestamptz default now()
```

### Tabela: `sharing_group_stores`
```
id                uuid PK
sharing_group_id  uuid FK -> sharing_groups.id ON DELETE CASCADE
store_id          uuid FK -> stores.id ON DELETE CASCADE
percentage        numeric NULL (null = divisao equal)
created_at        timestamptz default now()
UNIQUE(sharing_group_id, store_id)
```

### Alteracao: tabela `stores`
```
ADD COLUMN sharing_group_id uuid NULL FK -> sharing_groups.id ON DELETE SET NULL
```

### Alteracao: tabela `fixed_expenses`
```
ADD COLUMN cost_type text NOT NULL DEFAULT 'exclusive' CHECK (exclusive | shared)
ADD COLUMN sharing_group_id uuid NULL FK -> sharing_groups.id ON DELETE SET NULL
```

Regras via trigger de validacao:
- Se `cost_type = 'shared'` entao `store_id` DEVE ser NULL e `sharing_group_id` NOT NULL
- Se `cost_type = 'exclusive'` entao `sharing_group_id` DEVE ser NULL e `store_id` pode ter valor
- Nunca ambos preenchidos

### Tabela: `cost_allocations`
```
id                uuid PK
expense_id        uuid FK -> fixed_expenses.id ON DELETE CASCADE
store_id          uuid FK -> stores.id ON DELETE CASCADE
reference_month   text NOT NULL (ex: '2026-02')
allocated_amount  numeric NOT NULL default 0
division_type     text NOT NULL default 'equal'
total_stores      integer NOT NULL default 1
created_at        timestamptz default now()
UNIQUE(expense_id, store_id, reference_month)
```

### RLS
- Todas as novas tabelas: RLS habilitado
- `sharing_groups`: CRUD para owner (`user_id = auth.uid()`)
- `sharing_group_stores`: via join com sharing_groups.user_id
- `cost_allocations`: via join com stores.user_id

---

## 2. Engine de Recalculo Automatico

### Funcao SQL: `recalculate_shared_costs(group_id, ref_month)`

```
1. Buscar todas as lojas do grupo (sharing_group_stores)
2. Buscar todas as despesas compartilhadas (fixed_expenses WHERE sharing_group_id = group_id)
3. DELETE cost_allocations WHERE reference_month = ref_month AND expense_id IN (despesas do grupo)
4. Para cada despesa:
   - Se division_type = 'equal': allocated = amount / count(lojas)
   - INSERT cost_allocation para cada loja
5. Nunca tocar em meses anteriores ao atual
```

### Triggers que disparam recalculo:
- INSERT/DELETE em `sharing_group_stores` -> recalcular mes atual
- UPDATE em `fixed_expenses` WHERE cost_type = 'shared' -> recalcular mes atual
- Esses triggers chamam a funcao apenas para o mes corrente

---

## 3. Fluxo de Criacao de Nova Loja (UI)

### Alteracao: `CreateStoreModal.tsx`

Adicionar passo apos nome/tipo:

**Pergunta**: "Essa loja compartilha estrutura fisica com outra?"

Opcoes:
1. **Independente** - Cria loja normal sem grupo
2. **Compartilhada (Dark Kitchen)** - Exibe selector de loja base

Se compartilhada:
- Listar lojas existentes do usuario
- Se loja selecionada ja tem grupo: adicionar nova loja ao grupo existente
- Se nao tem grupo: criar novo sharing_group, associar ambas

**Pergunta**: "Deseja importar despesas compartilhaveis da loja base?"
- Se SIM: copiar referencia (nao duplicar) - as despesas shared do grupo ficam visiveis
- Se NAO: usuario cadastra manualmente depois

---

## 4. Visualizacao na Area de Negocio

### Alteracao: `FixedExpensesBlock.tsx`

Quando a loja ativa pertence a um grupo:

**Secao "Despesas Exclusivas"** (comportamento atual, sem mudanca)

**Secao "Despesas Compartilhadas"** (nova):
- Buscar cost_allocations do mes atual para a loja ativa
- Para cada despesa compartilhada, mostrar:

```
  Aluguel
  Total: R$ 2.000,00
  Dividido entre: 3 lojas (igual)
  Sua parcela: R$ 666,67
  [Ver divisao completa]
```

- Botao "Adicionar Despesa Compartilhada" (insere na tabela fixed_expenses com cost_type=shared e sharing_group_id)
- CRUD de despesas compartilhadas (editar valor total, nome, excluir)

### Alteracao: `SimplifiedDREBlock.tsx`

O DRE ja recebe `fixedExpensesTotal`. A mudanca:
- O total de despesas fixas passa a ser: `exclusivas + parcela_compartilhada`
- A parcela compartilhada vem da soma dos `cost_allocations.allocated_amount` do mes atual

### Alteracao: `TotalBusinessCostBlock.tsx`
- Mesma logica: somar parcela compartilhada ao total de despesas fixas

---

## 5. Seguranca e Validacoes

### Trigger: `validate_shared_expense_integrity`
- Impedir `cost_type = 'shared'` com `store_id` preenchido
- Impedir `cost_type = 'exclusive'` com `sharing_group_id` preenchido
- Impedir `sharing_group_id` sem grupo valido

### Confirmacao ao remover loja do grupo
- Dialog: "Os custos compartilhados serao recalculados para as lojas restantes. Deseja continuar?"
- Exigir confirmacao textual

### Protecao de historico
- cost_allocations de meses anteriores ao atual sao imutaveis (trigger de protecao)
- Apenas o mes corrente pode ser recalculado

---

## 6. Hook: `useSharingGroup.ts` (novo)

Responsabilidades:
- Buscar grupo da loja ativa
- Listar lojas do grupo
- Buscar despesas compartilhadas
- Buscar cost_allocations do mes atual
- CRUD de despesas compartilhadas
- Adicionar/remover loja do grupo
- Calcular total da parcela compartilhada para a loja ativa

---

## 7. Componente: `SharedExpensesBlock.tsx` (novo)

Exibe na Area de Negocio:
- Lista de despesas compartilhadas com parcela por loja
- Totalizador: "Sua parcela total: R$ X"
- Botao "Ver divisao completa" abre modal com todas as lojas e parcelas
- Formulario para adicionar/editar/remover despesa compartilhada
- Badge indicando numero de lojas no grupo

---

## Secao Tecnica - Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar sharing_groups, sharing_group_stores, cost_allocations; alterar stores e fixed_expenses; criar funcao recalculate_shared_costs; criar triggers |
| `src/hooks/useSharingGroup.ts` | Novo hook para gerenciar grupos e alocacoes |
| `src/components/business/SharedExpensesBlock.tsx` | Novo componente de visualizacao |
| `src/components/store/CreateStoreModal.tsx` | Adicionar fluxo de loja compartilhada |
| `src/components/business/FixedExpensesBlock.tsx` | Filtrar apenas cost_type = 'exclusive' |
| `src/pages/BusinessArea.tsx` | Adicionar SharedExpensesBlock e passar parcela ao DRE |
| `src/contexts/StoreContext.tsx` | Expor sharing_group_id da loja ativa |

### Formulas

```text
DIVISAO IGUALITARIA:
  parcela = valor_total / numero_de_lojas

EXEMPLO:
  Aluguel = R$ 3.000
  3 lojas no grupo
  Parcela por loja = R$ 1.000

DRE COM COMPARTILHAMENTO:
  Faturamento ........................ R$ 30.000
  (-) Despesas Fixas Exclusivas ...... R$  5.000
  (-) Despesas Compartilhadas ........ R$  1.000 (parcela)
  (-) Despesas Variaveis ............. R$  3.000
  (=) Lucro .......................... R$ 21.000
```

### Preparacao para Evolucao Futura

A coluna `division_type` na tabela `sharing_groups` aceita 'equal' ou 'manual'. No futuro:
- Adicionar 'revenue_based', 'order_based', 'area_based'
- A funcao `recalculate_shared_costs` ja recebe o tipo e pode ser estendida com CASE
- A tabela `sharing_group_stores.percentage` ja existe para divisao manual
- Nenhuma mudanca estrutural necessaria para evolucoes futuras

