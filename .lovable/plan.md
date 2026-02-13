
# Redesign: Botao "Atualizar Precos" no Dashboard

## Conceito

Transformar o widget atual (que ja mostra a lista de insumos inline) em duas partes:

1. **Botao-card chamativo no Dashboard** -- compacto, com icone animado, frase motivacional e contador de atualizacoes recentes
2. **Modal/Drawer** que abre ao clicar, contendo a busca e edicao de precos (logica atual)
3. **Feedback pos-salvamento** mostrando exatamente quantos insumos e quantas fichas tecnicas foram recalculadas

## O que o usuario vera

### No Dashboard (botao-card)
- Icone de refresh com pulso sutil (animacao CSS)
- Titulo: **"Atualizar Precos"**
- Subtitulo motivacional: *"Mantenha seus custos em dia e nao perca dinheiro"*
- Badge mostrando total de insumos cadastrados
- Efeito hover/active com escala e brilho

### Ao clicar (abre Drawer mobile / Dialog desktop)
- Campo de busca por nome ou codigo
- Lista de insumos com preco atual clicavel
- Ao salvar um preco, mostra um **resumo visual**:
  - "Tomate atualizado para R$ 8,50"
  - "3 fichas tecnicas recalculadas automaticamente"
  - Icone de check verde com animacao

### Resumo acumulado na sessao
- Apos cada atualizacao, o botao-card no dashboard atualiza um contador:
  - Ex: **"2 insumos atualizados hoje"**
  - Reforco positivo para o usuario continuar

## Detalhes Tecnicos

### Arquivo: `src/components/dashboard/QuickPriceUpdate.tsx`
- Refatorar para separar em dois componentes:
  - `QuickPriceButton` -- o card/botao visivel no dashboard
  - `QuickPriceModal` -- o drawer/dialog com a logica de edicao
- Manter toda a logica de cascade (já funciona)
- Adicionar estado `updatedCount` e `recipesAffectedCount` para feedback
- Usar `Drawer` (vaul) no mobile e `Dialog` no desktop via hook `use-mobile`

### Arquivo: `src/pages/Dashboard.tsx`
- Substituir o `<QuickPriceUpdate>` inline pelo novo `<QuickPriceButton>` dentro do grid de acesso rapido
- O botao ocupa uma posicao de destaque (pode ser full-width abaixo do grid de stats, ou integrado no grid de acesso rapido)

### Animacoes CSS
- Pulso sutil no icone (`animate-pulse` customizado, lento)
- `active:scale-[0.97]` no botao
- Transicao de cor no badge apos atualizacao (neutro -> verde)

### Feedback pos-save (dentro do modal)
- Toast substituido por um bloco inline no modal mostrando:
  - Nome do insumo + novo preco
  - Quantidade de `recipe_ingredients` afetados
  - Quantidade de `recipes` recalculadas
- Manter toast tambem para quando o modal fechar (resumo final)
