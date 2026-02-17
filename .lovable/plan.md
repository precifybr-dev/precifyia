

# Corrigir isolamento de dados entre lojas e onboarding passo-a-passo

## Problemas identificados

### 1. Dados da Loja 1 aparecendo na Loja 2
Os blocos de custos/despesas na Area de Negocio usam um filtro inclusivo que puxa registros com `store_id` nulo, fazendo dados antigos aparecerem em todas as lojas. Cada loja nova deve comecar com base zerada.

### 2. Onboarding sem sequencia
Todos os 4 passos ficam disponiveis ao mesmo tempo. O correto e liberar um por um, conforme o anterior e concluido.

---

## Solucao

### Parte 1 — Isolamento estrito de dados por loja

Trocar o filtro inclusivo pelo filtro estrito em 5 locais:

| Arquivo | Alteracao |
|---|---|
| `src/components/business/FixedCostsBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/VariableCostsBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/FixedExpensesBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/VariableExpensesBlock.tsx` | Filtro estrito por store_id |
| `supabase/functions/calculate-business-metrics/index.ts` | Filtro estrito na edge function |

**Antes:**
```text
if (storeId) query = query.or(`store_id.eq.${storeId},store_id.is.null`)
```

**Depois:**
```text
if (storeId) query = query.eq("store_id", storeId);
else query = query.is("store_id", null);
```

### Parte 2 — Onboarding sequencial (passo a passo)

Modificar `src/pages/StoreOnboarding.tsx`:
- Cada passo so fica habilitado quando o anterior esta concluido
- Passos bloqueados ficam com opacidade reduzida, sem clique, e com icone de cadeado
- Primeiro passo sempre disponivel

---

## Secao Tecnica

**Blocos de custos (4 arquivos):** Substituir a linha do filtro `.or(...)` por `.eq("store_id", storeId)` quando storeId existe, e `.is("store_id", null)` quando nao existe.

**Edge function `calculate-business-metrics`:** Aplicar a mesma logica no `storeFilter` interno.

**StoreOnboarding.tsx:** Adicionar propriedade `isLocked` a cada step, calculada com base no `isCompleted` do step anterior. Steps com `isLocked = true` nao navegam e exibem visual desabilitado.

