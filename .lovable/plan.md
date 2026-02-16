

# Correção: Troca de link do iFood mostra cardápio antigo

## Problema

Quando o usuário troca o link do iFood, o sistema continua mostrando o cardápio da loja anterior. Isso acontece por dois motivos:

1. Ao salvar o novo link, o cache antigo (menu_cache) não é limpo no banco
2. O parâmetro "forceRefresh" nunca é enviado para o backend, então ele sempre retorna o cache antigo (que tem validade de 6 horas)

## Solução

Duas correções simples:

### 1. Limpar o cache ao trocar o link (`useMenuMirror.ts`)

Na função `saveIfoodUrl`, ao fazer o update no banco, incluir `menu_cache: null` e `menu_cached_at: null` junto com o novo `ifood_url`. Isso garante que o cache antigo seja apagado antes de buscar o novo cardápio.

### 2. Enviar `forceRefresh` para o backend (`useMenuMirror.ts`)

Na função `fetchMenu`, incluir o parâmetro `forceRefresh` no body da chamada ao backend. Assim, quando o usuário clica "Atualizar" ou troca o link, o backend sabe que deve ignorar qualquer cache residual e buscar dados frescos da API do iFood.

## Seção Técnica

### Arquivo: `src/hooks/useMenuMirror.ts`

**Mudança 1 - `saveIfoodUrl`**: Alterar o `.update()` para incluir limpeza do cache:
```text
.update({ ifood_url: url, menu_cache: null, menu_cached_at: null })
```

**Mudança 2 - `fetchMenu`**: Adicionar `forceRefresh` ao body enviado ao Edge Function:
```text
body: {
  ifoodUrl: targetUrl,
  importType: "full_menu",
  storeId: activeStore?.id,
  forceRefresh: forceRefresh,  // NOVO
}
```

Nenhuma mudança no backend é necessária -- ele já lê `rawBody.forceRefresh` (linha 447 do Edge Function) e pula o cache quando é `true` (linha 520).

