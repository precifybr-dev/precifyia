
# Correção: "Conectar Cardápio" não atualiza após salvar link

## Problema Identificado

Quando o usuário cola o link do iFood e clica "Conectar", o sistema:
1. Salva o `ifood_url` no banco de dados (funciona OK)
2. Chama a Edge Function para buscar o cardápio (funciona OK - logs mostram 52 itens extraídos)
3. **MAS** o `StoreContext` não é notificado da mudança, então `activeStore.ifood_url` continua `null`
4. A interface continua mostrando o formulário de input como se nada tivesse sido salvo

O `useMenuMirror` lê o `ifoodUrl` de `(activeStore as any)?.ifood_url`, mas após o update no banco, o `activeStore` no contexto React não é atualizado.

## Solução

Atualizar o `useMenuMirror.ts` para sincronizar o `StoreContext` após salvar a URL, usando `refreshStores()` do contexto.

## Arquivos a Modificar

### 1. `src/hooks/useMenuMirror.ts`
- Importar `refreshStores` do `useStore()`
- Após o `supabase.from("stores").update(...)` bem-sucedido em `saveIfoodUrl`, chamar `await refreshStores()` para que o contexto reflita o novo `ifood_url`
- Fazer o mesmo no `clearUrl` para limpar o estado corretamente

### 2. `src/contexts/StoreContext.tsx`
- Adicionar `ifood_url` ao interface `Store` para que o TypeScript reconheça o campo sem precisar de `as any`
- Isso elimina os casts forçados em `useMenuMirror.ts`

## Detalhes Técnicos

**StoreContext.tsx** - Adicionar campo ao interface:
```text
export interface Store {
  ...campos existentes...
  ifood_url: string | null;   // NOVO
}
```

**useMenuMirror.ts** - Após salvar URL com sucesso:
```text
const { activeStore, refreshStores } = useStore();

const saveIfoodUrl = async (url: string) => {
  // ...update no banco...
  await refreshStores();  // Sincroniza o contexto
  await fetchMenu(url, true);
};

const clearUrl = async () => {
  // ...update no banco...
  await refreshStores();  // Sincroniza o contexto
};
```

Isso resolve o ciclo onde a URL era salva no banco mas o React nao sabia, mantendo a interface travada no formulário de input.
