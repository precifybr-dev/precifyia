
# Correcao: Cardapio Completo + Toggle de Categorias

## Problemas Identificados

### 1. Cardapio incompleto
A Edge Function `parse-ifood-menu` tem duas limitacoes criticas:
- **HTML truncado**: Envia apenas `pageContent.slice(0, 15000)` (15KB) para a IA, cortando cardapios grandes
- **Fetch simples**: iFood renderiza conteudo via JavaScript. Um `fetch()` basico nao captura o HTML completo com todos os itens
- **Sem paginacao**: A IA recebe conteudo parcial e extrai apenas os itens visiveis nesse trecho

### 2. Falta toggle de categorias
Atualmente os itens ja sao agrupados por categoria no `IfoodMenuView`, mas nao existe opcao de alternar entre visualizacao completa (lista unica) e separada por categorias.

---

## Solucao

### Parte 1: Aumentar captura do cardapio completo

**Arquivo**: `supabase/functions/parse-ifood-menu/index.ts`

Mudancas no modo `full_menu`:

1. **Aumentar limite de HTML** de 15.000 para 60.000 caracteres para capturar cardapios maiores
2. **Melhorar o prompt da IA** para enfatizar que TODOS os itens devem ser extraidos, mesmo que o HTML seja longo
3. **Adicionar instrucao de contagem**: pedir a IA para contar quantos itens encontrou e garantir que nenhum foi omitido
4. **Usar modelo mais capaz**: Trocar para `google/gemini-2.5-pro` no modo full_menu (janela de contexto maior, melhor para HTMLs grandes)

Prompt atualizado (trecho chave):
```
Regras OBRIGATORIAS:
1. Extraia ABSOLUTAMENTE TODOS os itens do cardapio, sem excecao
2. Nao pare no meio - percorra TODO o HTML ate o final
3. Se encontrar mais de 50 itens, inclua TODOS mesmo assim
4. Conte os itens ao final e confirme que nao omitiu nenhum
```

### Parte 2: Toggle "Separar itens por categoria"

**Arquivo**: `src/components/menu-mirror/IfoodMenuView.tsx`

Adicionar um `Switch` (toggle) no topo da lista com o label "Separar itens por categoria":

- **Toggle OFF (padrao)**: Exibe todos os itens em uma lista unica corrida, sem divisao por categoria, na ordem original do cardapio
- **Toggle ON**: Exibe os itens agrupados por categoria com headers de secao (comportamento atual)

A barra de categorias (pills de navegacao) so aparece quando o toggle esta ON.

### Parte 3: Imagens via link (ja implementado)

O sistema atual JA carrega imagens via URL (`item.image_url` direto do iFood). As imagens nao sao armazenadas na plataforma - sao carregadas sob demanda pelo navegador e desaparecem ao sair da pagina. Nenhuma alteracao necessaria aqui.

---

## Alteracoes Tecnicas

### Arquivo 1: `supabase/functions/parse-ifood-menu/index.ts`

**Linha ~200**: Mudar `pageContent.slice(0, 15000)` para `pageContent.slice(0, 60000)`

**Linha ~169-192**: Atualizar o prompt do sistema para ser mais enfatico sobre extrair TODOS os itens

**Linha ~221**: Usar modelo `google/gemini-2.5-pro` para o modo full_menu (maior contexto)

### Arquivo 2: `src/components/menu-mirror/IfoodMenuView.tsx`

Adicionar estado `separateByCategory` com `useState(true)` (default ON, que e o comportamento atual)

Adicionar um Switch/toggle acima da lista de itens:
```
[icon] Separar itens por categoria [toggle]
```

Quando OFF:
- Ocultar barra de categorias
- Renderizar todos os itens em sequencia sem headers de secao

Quando ON:
- Mostrar barra de categorias (comportamento atual)
- Mostrar items agrupados com headers

### Arquivo 3: `src/pages/MenuMirror.tsx`

Nenhuma alteracao necessaria - a logica fica contida no componente filho.

---

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/parse-ifood-menu/index.ts` | Aumentar limite HTML, melhorar prompt, usar modelo maior |
| `src/components/menu-mirror/IfoodMenuView.tsx` | Adicionar toggle separar/juntar categorias |
