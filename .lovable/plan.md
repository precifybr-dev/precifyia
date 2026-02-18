

# Recarregar dados frescos ao trocar de loja

## Problema atual

Quando o usuario troca de loja no StoreSwitcher, o sistema apenas atualiza o ponteiro local (`activeStore`) sem buscar dados atualizados do banco. Isso causa problemas como:
- `sharing_group_id` desatualizado (causa raiz do bug de compartilhamento)
- Dados em cache de uma loja "vazando" para outra
- Necessidade de workarounds como `refreshStores()` em varios pontos do codigo

## Solucao

Transformar a troca de loja em uma operacao que sempre busca dados frescos do banco, garantindo isolamento total entre lojas.

### 1. Atualizar `setActiveStore` no StoreContext

Modificar para que, ao trocar de loja, o sistema:
1. Marque `isLoading = true` (mostra loading na UI)
2. Busque os dados frescos da loja selecionada no banco (`stores` table)
3. Atualize o estado com dados frescos
4. Marque `isLoading = false`

Isso garante que `sharing_group_id`, `default_cmv`, e outros campos estejam sempre atualizados.

### 2. Emitir evento de troca de loja

Criar um contador `storeVersion` no contexto que incrementa a cada troca. Componentes filhos (FixedExpensesBlock, TaxesAndFeesBlock, etc.) ja reagem a mudancas em `activeStore?.id` nos seus `useEffect`/`useCallback`, entao ao receber dados frescos eles naturalmente refazem suas queries.

### 3. Remover `refreshStores()` do fluxo de compartilhamento

Com a troca de loja sempre buscando dados frescos, o `refreshStores()` no `confirmShare` se torna redundante para o problema de isolamento (mas pode ser mantido para atualizar a lista de lojas no StoreSwitcher imediatamente).

## Detalhes tecnicos

### Arquivo: `src/contexts/StoreContext.tsx`

Modificar `setActiveStore`:

```text
const setActiveStore = useCallback(async (store: Store | null) => {
  if (store) {
    localStorage.setItem(ACTIVE_STORE_KEY, store.id);
    setIsLoading(true);

    // Buscar dados frescos desta loja no banco
    const { data: freshStore } = await supabase
      .from("stores")
      .select("*")
      .eq("id", store.id)
      .single();

    setActiveStoreState(freshStore ? (freshStore as Store) : store);
    setIsLoading(false);
  } else {
    localStorage.removeItem(ACTIVE_STORE_KEY);
    setActiveStoreState(null);
  }
}, []);
```

### Arquivo: `src/components/store/StoreSwitcher.tsx`

Tornar `handleStoreSelect` async para aguardar a troca:

```text
const handleStoreSelect = async (store: typeof activeStore) => {
  if (!store) return;
  if (!isPro && stores.indexOf(store) > 0) return;
  await setActiveStore(store);
};
```

### Assinatura no contexto

Atualizar o tipo de `setActiveStore` de `(store: Store | null) => void` para `(store: Store | null) => Promise<void>` na interface `StoreContextType`.

## Resultado esperado

- Ao trocar de loja, o usuario ve um breve loading (milissegundos) enquanto dados frescos sao carregados
- `sharing_group_id` e todos os campos da loja estao sempre atualizados
- Elimina a classe inteira de bugs causados por dados em cache entre lojas
- Nao altera nenhuma logica de negocio ou componente UI existente
