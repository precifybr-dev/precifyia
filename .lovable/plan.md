
# Corrigir isolamento de dados entre lojas e onboarding passo-a-passo

## Problemas identificados

### 1. Dados da Loja 1 aparecendo na Loja 2
Os blocos de custos/despesas na Area de Negocio (FixedCostsBlock, VariableCostsBlock, FixedExpensesBlock, VariableExpensesBlock) usam um filtro inclusivo:
```text
store_id.eq.${storeId},store_id.is.null
```
Isso faz com que registros antigos (com store_id nulo) aparecam em TODAS as lojas. Para lojas novas, os dados devem ser completamente isolados.

A edge function `calculate-business-metrics` tambem usa o mesmo filtro inclusivo.

### 2. Onboarding sem sequencia
Todos os 4 passos do onboarding da nova loja estao disponiveis simultaneamente. O usuario quer que seja passo-a-passo: so pode iniciar o proximo quando o anterior estiver concluido.

## Solucao

### Parte 1 — Isolamento de dados por loja

Alterar a logica de filtragem nos 4 blocos de custos/despesas e na edge function para usar filtro **estrito** quando o `storeId` estiver definido:

**Antes:** `query.or(\`store_id.eq.${storeId},store_id.is.null\`)`  
**Depois:** `query.eq("store_id", storeId)`

Arquivos a modificar:
- `src/components/business/FixedCostsBlock.tsx` (linha 35)
- `src/components/business/VariableCostsBlock.tsx` (linha 35)
- `src/components/business/FixedExpensesBlock.tsx` (linha 36)
- `src/components/business/VariableExpensesBlock.tsx` (linha 36)
- `supabase/functions/calculate-business-metrics/index.ts` (linha 109)

### Parte 2 — Onboarding sequencial (passo a passo)

Modificar `src/pages/StoreOnboarding.tsx` para:
- Adicionar logica de "desbloqueio" sequencial: cada passo so fica habilitado quando o anterior esta concluido
- Passos bloqueados ficam com visual desabilitado (opacidade reduzida, sem cursor pointer)
- O botao muda de "Iniciar" para um icone de cadeado nos passos bloqueados
- Manter o primeiro passo sempre disponivel

## Secao Tecnica

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/business/FixedCostsBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/VariableCostsBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/FixedExpensesBlock.tsx` | Filtro estrito por store_id |
| `src/components/business/VariableExpensesBlock.tsx` | Filtro estrito por store_id |
| `supabase/functions/calculate-business-metrics/index.ts` | Filtro estrito por store_id |
| `src/pages/StoreOnboarding.tsx` | Logica sequencial de passos |

### Detalhe das mudancas

**Blocos de custos (4 arquivos):** Trocar a linha do filtro de:
```typescript
if (storeId) query = query.or(`store_id.eq.${storeId},store_id.is.null`);
```
Para:
```typescript
if (storeId) query = query.eq("store_id", storeId);
else query = query.is("store_id", null);
```

**Edge function:** Mesma alteracao no `storeFilter`:
```typescript
const storeFilter = (query: any) => {
  if (storeId) return query.eq("store_id", storeId);
  return query.is("store_id", null);
};
```

**StoreOnboarding.tsx:** Adicionar propriedade `isLocked` aos steps baseado no passo anterior nao estar concluido. Steps bloqueados nao navegam e mostram visual desabilitado com icone de cadeado.
