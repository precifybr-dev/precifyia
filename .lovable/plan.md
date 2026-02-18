
# Corrigir dados compartilhados orfaos e proteger a UI

## Problema

As lojas secundarias foram excluidas, mas as despesas compartilhadas continuam com `cost_type = 'shared'`, `shared_store_ids` referenciando lojas que nao existem mais, e o grupo de compartilhamento ainda existe com apenas 1 loja. Isso causa:

- Badges "3 lojas" e "2 lojas" aparecendo nas despesas
- "Resumo de Custos Compartilhados" visivel mesmo sem lojas adicionais
- Calculos de parcela incorretos (dividindo por lojas que nao existem)

A causa raiz: o trigger `cleanup_sharing_after_store_delete` depende de contar registros em `sharing_group_stores`, mas as entradas podem ser removidas por CASCADE antes do trigger AFTER DELETE rodar, ou o trigger foi criado depois das exclusoes ja terem ocorrido.

## Solucao em 3 partes

### 1. Migracao para limpar dados orfaos existentes

Executar SQL que:
- Identifica grupos com 1 ou 0 lojas reais
- Converte todas as despesas `shared` desses grupos para `exclusive` da loja restante
- Limpa `sharing_group_id` da loja restante
- Remove o grupo orfao
- Remove IDs de lojas inexistentes de `shared_store_ids` em todas as despesas

### 2. Melhorar o trigger para ser mais robusto

Alterar o trigger para validar contra a tabela `stores` real (nao apenas `sharing_group_stores`) ao contar lojas restantes, garantindo que lojas realmente existentes sejam consideradas.

### 3. Guards na UI (FixedExpensesBlock)

Adicionar verificacoes extras no componente:
- Badge "X lojas" so aparece se `stores.length > 1` (lojas reais do usuario)
- "Resumo de Custos Compartilhados" so aparece se `stores.length > 1`
- Linha "Sua parcela" so aparece se `stores.length > 1`
- `SharedExpensesBlock` retorna `null` se `stores.length <= 1`

## Detalhes tecnicos

### Migracao SQL

```text
-- 1. Limpar shared_store_ids com IDs de lojas inexistentes
UPDATE fixed_expenses fe
SET shared_store_ids = (
  SELECT array_agg(sid)
  FROM unnest(fe.shared_store_ids) AS sid
  WHERE EXISTS (SELECT 1 FROM stores WHERE id = sid)
)
WHERE fe.shared_store_ids IS NOT NULL;

-- 2. Encontrar grupos orfaos (0 ou 1 loja real restante)
-- Para cada grupo: converter despesas shared -> exclusive, limpar grupo

-- 3. Recriar trigger mais robusto que valida contra tabela stores
```

### FixedExpensesBlock.tsx

Todas as secoes que mostram informacao de compartilhamento ganham guard `stores.length > 1`:

- Linha 525-530 (Badge "X lojas"): adicionar `&& stores.length > 1`
- Linha 539-548 (botao Eye): adicionar `&& stores.length > 1`
- Linha 561-568 (linha "Sua parcela"): adicionar `&& stores.length > 1`
- Linha 640-665 (Resumo de Custos Compartilhados): adicionar `&& stores.length > 1`

### SharedExpensesBlock.tsx

Importar `useStore` e adicionar guard:
```text
const { stores } = useStore();
if (!hasGroup || stores.length <= 1) return null;
```

### useSharingGroup.ts

Adicionar guard: se `stores.length <= 1`, retornar `hasGroup: false` independente do banco, forcando todos os componentes a esconderem a UI de compartilhamento.

## Resultado esperado

- Com 1 loja: nenhuma UI de compartilhamento visivel, despesas sao todas exclusivas
- Com 2+ lojas: funcionalidade de compartilhamento disponivel normalmente
- Dados orfaos existentes sao limpos automaticamente pela migracao
- Trigger protege contra orfaos futuros
