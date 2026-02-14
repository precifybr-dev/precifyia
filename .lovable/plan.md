

## Modulo "Meu Cardapio" - Espelho em Tempo Real

### Resumo

Criar uma pagina onde o usuario ve seu cardapio do iFood renderizado visualmente no estilo do iFood, sem salvar nada no banco de dados. Toda vez que abrir a pagina, o sistema busca os dados ao vivo via IA e exibe na tela. Apenas o link do iFood fica salvo na tabela `stores` (campo novo `ifood_url`).

### Como funciona

1. O usuario cola o link do iFood uma unica vez (salva no campo `ifood_url` da loja ativa)
2. Toda vez que abre a pagina "Meu Cardapio", o sistema chama a edge function que faz scrape + IA e retorna os itens com nome, descricao, preco, categoria e URL da imagem
3. Os dados ficam apenas em memoria (state do React) - nada vai pro banco
4. As imagens sao exibidas direto do iFood (URLs externas), sem armazenamento

### Passos de implementacao

1. **Migracao SQL: adicionar coluna `ifood_url` na tabela `stores`**
   - `ALTER TABLE stores ADD COLUMN ifood_url TEXT;`
   - Sem tabela nova, sem armazenamento de itens

2. **Atualizar Edge Function `parse-ifood-menu`**
   - Novo `importType: "full_menu"` que instrui a IA a retornar dados completos:
     - `name`, `description`, `price` (numerico), `category`, `image_url`
   - Prompt especifico para extrair todos os detalhes do HTML da pagina incluindo precos e links de imagens encontrados no HTML
   - Enviar ate 15.000 caracteres do HTML para a IA ter mais contexto

3. **Criar pagina `src/pages/MenuMirror.tsx`**
   - Se a loja nao tem `ifood_url`: mostra input para colar o link + botao salvar
   - Se ja tem: carrega automaticamente ao abrir (chama a edge function)
   - Botao "Atualizar" para re-buscar
   - Botao "Trocar link" para alterar a URL
   - O link do iFood nunca aparece visivel na tela

4. **Criar componente `src/components/menu-mirror/IfoodMenuView.tsx`**
   - Layout visual inspirado no iFood:
     - Header com nome da loja e icone
     - Barra de categorias scrollavel horizontal
     - Cards de produtos agrupados por categoria
     - Cada card: imagem (80x80) a esquerda, nome em negrito, descricao truncada, preco formatado (R$) a direita
   - Cores: vermelho iFood (#EA1D2C) como accent, fundo branco/cinza claro
   - Loading skeleton enquanto carrega
   - Fallback de imagem caso URL esteja quebrada

5. **Criar hook `src/hooks/useMenuMirror.ts`**
   - Gerencia o state dos itens do cardapio (em memoria apenas)
   - Funcao `fetchMenu()` que chama `supabase.functions.invoke("parse-ifood-menu", { body: { ifoodUrl, importType: "full_menu" } })`
   - Funcao `saveIfoodUrl()` que salva o link na tabela stores
   - Loading e error states

6. **Adicionar rota e sidebar**
   - Nova rota `/app/menu` no `App.tsx`
   - Novo item na sidebar: "Meu Cardapio" com icone `UtensilsCrossed` (entre Combos e Universidade)

### Detalhes tecnicos

**Prompt da IA para `full_menu`:**
A IA recebera o HTML da pagina e devera retornar JSON com estrutura:
```text
{
  "storeName": "Nome da Loja",
  "items": [
    {
      "name": "X-Burguer",
      "description": "Pao, hamburguer, queijo, alface e tomate",
      "price": 25.90,
      "category": "Lanches",
      "image_url": "https://static-images.ifood.com.br/..."
    }
  ]
}
```

**Nenhuma tabela nova criada** - apenas 1 coluna `ifood_url` na tabela `stores`. Itens do cardapio vivem somente no state do React e sao buscados a cada abertura da pagina.

**Imagens** servidas diretamente das URLs do iFood (CDN deles), sem download nem storage.

### Arquivos criados/modificados
- **Migracao**: adicionar `ifood_url` em `stores`
- **Criado**: `src/pages/MenuMirror.tsx`
- **Criado**: `src/components/menu-mirror/IfoodMenuView.tsx`
- **Criado**: `src/hooks/useMenuMirror.ts`
- **Modificado**: `supabase/functions/parse-ifood-menu/index.ts` (novo modo full_menu)
- **Modificado**: `src/App.tsx` (nova rota)
- **Modificado**: `src/components/layout/AppSidebar.tsx` (novo item no menu)
