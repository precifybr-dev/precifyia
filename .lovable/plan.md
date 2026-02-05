
# Plano: Departamento de Segurança para Proteção de Dados

## Visão Geral

Vamos criar um sistema de segurança robusto que protege dados críticos (Fichas Técnicas, Insumos, Sub-receitas, Bebidas) contra exclusões acidentais, com múltiplas confirmações e avisos claros antes de qualquer ação destrutiva.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                  DEPARTAMENTO DE SEGURANÇA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  SOFT DELETE │   │ AUDIT LOG    │   │ MULTI-CONFIRM    │    │
│  │  (Lixeira)   │   │ (Histórico)  │   │ (Segurança UI)   │    │
│  └──────────────┘   └──────────────┘   └──────────────────┘    │
│         │                  │                    │               │
│         ▼                  ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PROTEÇÃO EM 3 CAMADAS                       │   │
│  │                                                          │   │
│  │  1. UI: Confirmações múltiplas com alertas visuais      │   │
│  │  2. Backend: Soft delete (dados vão p/ lixeira)         │   │
│  │  3. Banco: Audit log de todas as ações                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Componente de Confirmação Multi-Etapa

Criar um componente reutilizável que exige múltiplas confirmações antes de ações destrutivas.

**Arquivo:** `src/components/security/DestructiveActionDialog.tsx`

**Funcionalidades:**
- Etapa 1: Aviso inicial explicando o que será afetado
- Etapa 2: Mostrar impacto (ex: "5 fichas técnicas usam este insumo")
- Etapa 3: Digitar confirmação textual (ex: "EXCLUIR")
- Timer de 3 segundos antes de liberar o botão final
- Ícones e cores de alerta (vermelho/amarelo)

---

## 2. Sistema de Soft Delete (Lixeira)

Em vez de deletar permanentemente, mover dados para tabelas de lixeira.

**Novas Tabelas no Banco:**

```sql
-- Tabela para dados "deletados" (soft delete)
CREATE TABLE public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  user_id UUID NOT NULL,
  store_id UUID,
  data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  deleted_by UUID,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  restored_at TIMESTAMPTZ,
  is_restored BOOLEAN DEFAULT false
);

-- Log de auditoria para todas as ações destrutivas
CREATE TABLE public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  confirmation_steps INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Hook de Segurança Centralizado

**Arquivo:** `src/hooks/useDataProtection.ts`

**Funcionalidades:**
- `softDelete(table, id)` - Move para lixeira em vez de deletar
- `hardDelete(table, id)` - Exclusão permanente (requer confirmação extra)
- `restore(deletedRecordId)` - Restaurar da lixeira
- `logAction(action, details)` - Registrar no audit log
- `getDeletedItems(table)` - Listar itens na lixeira

---

## 4. Fluxo de Confirmação para Ações Críticas

### Para Insumos:
```text
1. Clique em "Excluir"
2. Modal aparece mostrando:
   - "Este insumo está em X fichas técnicas"
   - "Se excluir, as fichas perderão este ingrediente"
3. Opções: "Substituir por outro" ou "Excluir mesmo assim"
4. Se "Excluir mesmo assim":
   - Segunda confirmação: "Digite EXCLUIR para confirmar"
   - Botão só ativa após 3 segundos
5. Dados vão para lixeira (recuperáveis por 30 dias)
```

### Para Fichas Técnicas:
```text
1. Clique em "Excluir"
2. Modal mostra custo total e ingredientes da ficha
3. Confirmação: "Esta ação pode ser desfeita em até 30 dias"
4. Digitar nome da ficha para confirmar
5. Soft delete com registro no audit log
```

---

## 5. Página de Lixeira/Recuperação

**Arquivo:** `src/pages/RecycleBin.tsx`

**Funcionalidades:**
- Listar todos os itens deletados por tabela
- Filtros: Insumos, Fichas Técnicas, Bebidas, Sub-receitas
- Botão "Restaurar" para cada item
- Contador de dias até exclusão permanente
- Exclusão permanente manual (com confirmação extra)

---

## 6. Integração nos Componentes Existentes

**Arquivos a modificar:**

| Arquivo | Modificação |
|---------|-------------|
| `DeleteIngredientDialog.tsx` | Usar novo sistema de multi-confirmação |
| `Recipes.tsx` | Substituir delete por softDelete |
| `SubRecipes.tsx` | Substituir delete por softDelete |
| `Beverages.tsx` | Substituir delete por softDelete |
| `FixedCostsBlock.tsx` | Adicionar confirmação |
| `VariableCostsBlock.tsx` | Adicionar confirmação |
| `FixedExpensesBlock.tsx` | Adicionar confirmação |
| `VariableExpensesBlock.tsx` | Adicionar confirmação |

---

## 7. Proteção no Banco de Dados

**Triggers de Segurança:**

```sql
-- Trigger que impede DELETE direto em tabelas críticas
CREATE OR REPLACE FUNCTION prevent_direct_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Força uso do soft delete
  RAISE EXCEPTION 'Exclusão direta não permitida. Use o sistema de lixeira.';
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas críticas
CREATE TRIGGER protect_ingredients 
  BEFORE DELETE ON ingredients 
  FOR EACH ROW EXECUTE FUNCTION prevent_direct_delete();
```

**Nota:** Triggers podem ser desabilitados para manutenção pelo MASTER.

---

## 8. Dashboard de Segurança (Admin)

Adicionar ao painel administrativo:

- Total de itens na lixeira
- Ações destrutivas nos últimos 7 dias
- Alertas de itens prestes a expirar
- Log de restaurações

---

## Resumo de Arquivos

### Novos Arquivos:
1. `src/components/security/DestructiveActionDialog.tsx`
2. `src/components/security/ConfirmationInput.tsx`
3. `src/hooks/useDataProtection.ts`
4. `src/pages/RecycleBin.tsx`

### Arquivos Modificados:
1. `src/components/ingredients/DeleteIngredientDialog.tsx`
2. `src/pages/Recipes.tsx`
3. `src/pages/SubRecipes.tsx`
4. `src/pages/Beverages.tsx`
5. Blocos de custos/despesas na Área do Negócio

### Migração SQL:
1. Tabela `deleted_records`
2. Tabela `data_audit_log`
3. Triggers de proteção
4. Políticas RLS

---

## Benefícios

- **Zero perda de dados acidental** - Tudo vai para lixeira primeiro
- **30 dias para recuperar** - Tempo suficiente para perceber erros
- **Rastreabilidade total** - Quem deletou, quando, o quê
- **Confirmações claras** - Impossível deletar "sem querer"
- **Diferencial competitivo** - Segurança que planilhas não oferecem

