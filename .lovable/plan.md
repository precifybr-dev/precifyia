
# Remover IA da Extracao do Cardapio iFood - Extracao Direta via JSON

## Objetivo
Eliminar completamente o uso de IA para o modo `full_menu` do parse-ifood-menu, substituindo por extracao direta do JSON embutido na pagina do iFood (via `__NEXT_DATA__` / `initialState`). Custo de IA na importacao vai a zero.

## Como Funciona Hoje (Problema)
1. Edge Function faz `fetch` do HTML da pagina do iFood
2. Envia o HTML (ate 60KB) para o Gemini Pro via Lovable AI
3. IA interpreta e retorna JSON com os itens
4. Custo: ~$0.17-0.25 por chamada, a cada carregamento da pagina

## Como Vai Funcionar (Solucao)

### Estrategia de Extracao (sem IA)
O site do iFood usa Next.js e embute os dados do cardapio completo em uma tag `<script type="application/json">` no HTML. A estrutura e:

```text
props.initialState.restaurant.details -> nome da loja
props.initialState.restaurant.menu -> array de categorias
  cada categoria tem:
    - name (nome da categoria)
    - itens (array de itens)
      cada item tem:
        - description (nome do produto)
        - details (descricao)
        - unitPrice (preco em centavos ou reais)
        - logoUrl (URL da imagem)
        - choices (complementos)
```

### Fluxo Novo
1. Fetch do HTML da pagina
2. Procurar `<script type="application/json">` ou `__NEXT_DATA__`
3. Fazer parse do JSON e navegar ate `props.initialState.restaurant.menu`
4. Extrair todos os itens diretamente, sem IA
5. Se o JSON nao for encontrado (iFood mudou a estrutura), retornar erro claro ao usuario
6. Salvar resultado no banco (coluna `menu_cache` na tabela `stores`) com timestamp
7. Ao carregar a pagina, ler do banco primeiro. So refazer fetch quando usuario clicar "Atualizar"

### Fallback
- Se a estrutura do JSON mudou: erro claro "Estrutura do iFood foi alterada. Entre em contato com o suporte."
- **NAO** chamar IA automaticamente em nenhum cenario
- Registrar erro no log para monitoramento

## Alteracoes Tecnicas

### 1. Migration SQL - Adicionar cache na tabela stores
```sql
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS menu_cache jsonb,
  ADD COLUMN IF NOT EXISTS menu_cached_at timestamptz;
```
Armazena o JSON completo do cardapio e quando foi capturado.

### 2. Edge Function `parse-ifood-menu/index.ts` - Modo full_menu
Reescrever o bloco `full_menu` (linhas 164-293) para:

- Remover chamada ao Lovable AI Gateway
- Remover circuit breaker de IA
- Remover log de tokens
- Adicionar parser direto do JSON embutido:
  1. Buscar `<script id="__NEXT_DATA__"` ou `<script type="application/json">`
  2. JSON.parse do conteudo
  3. Navegar para `props.initialState.restaurant.menu` ou `props.pageProps`
  4. Mapear cada categoria e seus itens para o formato interno
  5. Salvar resultado em `stores.menu_cache` e `stores.menu_cached_at`
- Manter rate limiting e autenticacao existentes
- Registrar log em `strategic_usage_logs` com `tokens_used: 0` (para tracking sem custo)

**O modo `ingredients`/`recipes` (linhas 296-410) CONTINUA usando IA normalmente** - so o full_menu perde IA.

### 3. Hook `useMenuMirror.ts`
Alterar `fetchMenu` para:
- Primeiro tentar ler `menu_cache` do banco (da tabela stores)
- Se existir cache, usar direto (sem chamar Edge Function)
- Botao "Atualizar" forca nova chamada a Edge Function
- `saveIfoodUrl` faz fetch e salva cache automaticamente

### 4. Pagina `MenuMirror.tsx`
- Auto-fetch ao montar agora le do cache local (sem custo)
- Botao "Atualizar" e o unico que dispara nova extracao

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar `menu_cache` e `menu_cached_at` na tabela `stores` |
| `supabase/functions/parse-ifood-menu/index.ts` | Reescrever modo full_menu sem IA, parser direto do JSON |
| `src/hooks/useMenuMirror.ts` | Ler cache do banco, so chamar Edge Function no "Atualizar" |
| `src/pages/MenuMirror.tsx` | Ajustar auto-fetch para usar cache |

## Resultado Esperado
- **Custo de IA no full_menu: $0.00** (zero)
- Cardapio completo com TODOS os itens (dados vem direto do iFood, sem truncamento)
- Imagens via URL externa (sem armazenamento)
- Cache no banco evita chamadas repetidas
- Fallback claro sem IA automatica
