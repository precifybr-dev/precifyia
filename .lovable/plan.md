
# Sincronizar Despesas Compartilhadas ao Criar Nova Loja no Grupo

## Problema

Quando a terceira loja e criada e vinculada ao grupo existente (ex: Dark Kitchen), as despesas compartilhadas da loja base nao aparecem automaticamente na nova loja e a divisao nao e atualizada para /3 em todas as lojas do grupo. Isso acontece porque:

1. O `createGroupAndLink` adiciona a loja ao grupo corretamente, mas o front-end da nova loja pode nao recarregar os dados do grupo apos a criacao
2. Falta um prompt visual na Area de Negocio para lojas novas que entraram em um grupo, confirmando que as despesas serao divididas

## Solucao

Dois ajustes: (A) garantir que o recalculo funcione corretamente no backend ao adicionar uma loja ao grupo, e (B) adicionar um banner informativo na Area de Negocio para lojas recentemente adicionadas a um grupo.

### Mudancas Tecnicas

**1. `src/hooks/useSharingGroup.ts` — Forcar recalculo ao adicionar loja ao grupo existente**

Apos inserir a nova loja no `sharing_group_stores` e atualizar o `sharing_group_id` da store, chamar explicitamente a funcao `recalculate_shared_costs` via RPC para garantir que as alocacoes sejam redistribuidas para todas as lojas (incluindo a nova).

```typescript
// Dentro de createGroupAndLink, apos adicionar ao grupo existente:
await supabase.rpc("recalculate_shared_costs", { p_group_id: groupId });
```

Tambem chamar `recalculate_shared_costs` ao criar um grupo novo com duas lojas.

**2. `src/components/business/FixedExpensesBlock.tsx` — Banner de boas-vindas ao grupo**

Adicionar um banner que aparece quando:
- A loja pertence a um grupo (`hasGroup === true`)
- A loja nao tem despesas compartilhadas listadas ainda
- Existem despesas compartilhadas no grupo (vindas de outras lojas)

O banner informara:
> "Esta loja faz parte do grupo [nome]. As despesas compartilhadas estao sendo divididas entre [N] lojas."

Nao precisa de botao de acao — as despesas compartilhadas ja aparecerao automaticamente na lista apos o fix do item 1. O banner serve apenas como contexto visual.

**3. `src/contexts/StoreContext.tsx` — Refresh apos criacao de loja**

No `CreateStoreModal`, apos criar a loja e vincular ao grupo, chamar `refreshStores()` para que o `activeStore` atualizado (com `sharing_group_id`) seja propagado para todos os componentes que dependem dele.

**4. `src/components/store/CreateStoreModal.tsx` — Chamar refreshStores apos criacao**

Adicionar chamada a `refreshStores()` apos a criacao e vinculacao da loja ao grupo, garantindo que o contexto global reflita o `sharing_group_id` da nova loja.

### Fluxo Corrigido

```text
Criar Loja 3 (compartilhada com Loja 2)
  |
  v
Loja 2 ja tem grupo? SIM
  |
  v
Inserir Loja 3 em sharing_group_stores
  |
  v
Atualizar stores.sharing_group_id da Loja 3
  |
  v
Chamar recalculate_shared_costs(group_id)
  |
  v
Alocacoes recalculadas: todas as despesas agora divididas por 3
  |
  v
refreshStores() -> activeStore atualizado com sharing_group_id
  |
  v
FixedExpensesBlock carrega despesas compartilhadas do grupo
  |
  v
Divisao exibida como /3 em todas as lojas
```

### Resultado Esperado

- Ao criar a terceira loja vinculada ao grupo, as despesas compartilhadas aparecem imediatamente na Area de Negocio da nova loja
- A divisao e atualizada automaticamente para /3 em TODAS as lojas do grupo (1, 2 e 3)
- Um banner contextual informa que a loja faz parte do grupo e quantas lojas dividem os custos
- Nenhuma mudanca no esquema do banco de dados — apenas logica de front-end e chamada RPC existente
