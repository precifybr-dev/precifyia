

# Redesign: Botao "Atualizar Precos" com Animacao de Carrinho

## Resumo

Transformar o botao e o modal de atualizacao de precos para incluir:
1. Botao verde destacado no Dashboard com texto "Atualizar Precos"
2. Modal redesenhado mostrando valor anterior ao editar
3. Animacao de carrinho de mercado viajando ate icone de sincronizacao durante o salvamento
4. Contagem em tempo real de fichas tecnicas atualizadas durante a animacao

## O que o usuario vera

### Botao no Dashboard
- Botao com fundo verde (bg-success), texto branco "Atualizar Precos"
- Icone de carrinho de mercado (ShoppingCart)
- Ao ter atualizacoes na sessao, mostra contador abaixo

### Ao clicar no preco de um insumo para editar
- Campo de edicao aparece com o **valor anterior** visivel (ex: "Anterior: R$ 5,00")
- Novo campo para digitar o valor atualizado

### Ao salvar (animacao de carrinho)
- O modal mostra uma animacao centralizada:
  - Icone de carrinho (ShoppingCart) se move da esquerda para a direita
  - No destino, um icone de sincronizacao (RefreshCw) girando
  - Barra de progresso acompanha o movimento
  - Texto mostrando em tempo real: "Atualizando ficha 1 de 5..."
- Ao completar, icone de check verde com contagem final
- Resultado fica visivel: "3 fichas tecnicas atualizadas"

## Detalhes Tecnicos

### Arquivo: `src/components/dashboard/QuickPriceButton.tsx`
- Trocar o estilo do botao para verde (bg-success text-white)
- Usar icone ShoppingCart em vez de RefreshCw
- Texto principal: "Atualizar Precos"
- Manter badge de contagem e feedback pos-sessao

### Arquivo: `src/components/dashboard/QuickPriceModal.tsx`
- Adicionar estado `syncPhase`: "idle" | "syncing" | "complete"
- Adicionar estado `syncProgress`: { current: number, total: number }
- Ao editar um insumo, mostrar `previousPrice` (valor antes da edicao)
- Substituir o loading simples por animacao de carrinho:
  - Fase "syncing": container com carrinho animado (translateX de 0% a 100%), barra de progresso, icone RefreshCw girando no destino
  - Texto dinamico: "Sincronizando ficha X de Y..."
  - Fase "complete": icone CheckCircle verde, resumo final
- Usar CSS keyframes para a animacao do carrinho (translateX com ease-in-out)
- O handleSave sera modificado para atualizar `syncProgress` a cada ficha tecnica processada (loop ja existente no codigo)

### Arquivo: `src/index.css` (ou inline styles)
- Adicionar keyframe `@keyframes cart-travel` para o movimento do carrinho
- Animacao de ~2-3s com easing suave

### Arquivo: `src/components/dashboard/QuickPriceUpdate.tsx`
- Sem alteracoes estruturais, apenas passa os novos props se necessario

### Fluxo tecnico do salvamento com animacao
1. Usuario clica salvar -> `syncPhase = "syncing"`, `syncProgress = { current: 0, total: recipeIds.length }`
2. Loop existente de atualizacao de receitas: a cada iteracao, incrementa `syncProgress.current`
3. Animacao do carrinho acompanha o progresso (width da barra = current/total * 100%)
4. Ao terminar -> `syncPhase = "complete"`, mostra resultado final
5. Apos 3 segundos, volta para `syncPhase = "idle"`
