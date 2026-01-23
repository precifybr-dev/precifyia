
# Corrigir Dropdown de Ingredientes - Integrar na Pagina

## Problema Identificado

O dropdown de sugestoes de ingredientes usa `position: absolute` dentro de uma tabela que tem `overflow-x: auto`. Isso faz com que o dropdown seja cortado/escondido quando o usuario rola a pagina ou quando ele fica atras do botao "+ Adicionar ingrediente".

## Causa Tecnica

```text
+-------------------------------------------+
| div.overflow-x-auto                       |
|   +---------------------------------------+
|   | Table                                 |
|   |   +----------------------------------+|
|   |   | IngredientSelector               ||
|   |   |   +----------------------------+ ||
|   |   |   | Dropdown (position:absolute)| || <-- CORTADO pelo overflow
|   |   |   +----------------------------+ ||
|   |   +----------------------------------+|
|   +---------------------------------------+
+-------------------------------------------+
| Button "+ Adicionar ingrediente"          | <-- COBRE o dropdown
+-------------------------------------------+
```

---

## Solucao Proposta

Usar React Portal para renderizar o dropdown fora da hierarquia DOM da tabela, permitindo que ele apareca sobre qualquer elemento.

### Alteracoes

**1. IngredientSelector.tsx**

- Usar `createPortal` do React para renderizar o dropdown no `document.body`
- Calcular a posicao absoluta do input na tela usando `getBoundingClientRect()`
- Detectar se ha espaco suficiente abaixo do input, caso contrario abrir para cima
- Adicionar listener para reposicionar ao fazer scroll

```text
+-------------------------------------------+
| Tabela (overflow-x: auto)                 |
|   +---------------------------------------+
|   | Input de busca                        |
|   +---------------------------------------+
+-------------------------------------------+

+-------------------------------------------+  <-- Portal renderizado no body
| Dropdown posicionado via getBoundingClientRect()
| z-index: 9999
+-------------------------------------------+
```

---

## Detalhes Tecnicos

### Novo Comportamento do Dropdown

1. Ao focar no input, calcular a posicao exata na tela
2. Renderizar dropdown via Portal no `document.body`
3. Posicionar usando `position: fixed` + coordenadas calculadas
4. Detectar se abre para cima ou para baixo baseado no espaco disponivel
5. Atualizar posicao em eventos de scroll/resize
6. Fechar ao clicar fora ou ao perder foco

### Estados Adicionais

- `dropdownPosition: { top, left, width }` - posicao calculada do dropdown
- `openDirection: 'up' | 'down'` - direcao de abertura

### Calculos de Posicao

```typescript
// Ao abrir o dropdown
const rect = inputRef.current.getBoundingClientRect();
const spaceBelow = window.innerHeight - rect.bottom;
const dropdownHeight = 256; // max-h-64 = 16rem = 256px

if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
  // Abrir para cima
  setDropdownPosition({
    top: rect.top - dropdownHeight,
    left: rect.left,
    width: rect.width
  });
  setOpenDirection('up');
} else {
  // Abrir para baixo (padrao)
  setDropdownPosition({
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width
  });
  setOpenDirection('down');
}
```

---

## Arquivos a Modificar

1. `src/components/recipes/IngredientSelector.tsx`
   - Importar `createPortal` do `react-dom`
   - Adicionar estados para posicao e direcao
   - Calcular posicao ao focar/abrir
   - Adicionar listeners para scroll e resize
   - Renderizar dropdown via Portal com `position: fixed`

---

## Resultado Final

O dropdown de ingredientes sera renderizado fora da tabela, aparecendo sempre na frente de todos os elementos, incluindo o botao "+ Adicionar ingrediente". Alem disso, detectara automaticamente se deve abrir para cima ou para baixo baseado no espaco disponivel na tela.
