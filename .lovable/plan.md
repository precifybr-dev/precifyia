

## Plano: Compactar ficha técnica e tabela de receitas

### 1. Ficha Técnica (formulário de edição/criação) — `src/pages/Recipes.tsx`
- Reduzir padding do card de `p-6` para `p-4`
- Reduzir `mb-6` entre seções para `mb-4`
- Compactar header do formulário: icon de `w-10 h-10` para `w-8 h-8`, título de `text-lg` para `text-base`
- Reduzir padding da dica de uso de `p-4` para `p-3`
- Grid de nome/rendimento/CMV: `gap-4` para `gap-3`

### 2. Tabela de insumos — `src/components/recipes/IngredientsSpreadsheetTable.tsx`
- Reduzir larguras das colunas (Código `w-16`, QTD `w-20`, UND `w-16`, FAT.C `w-16`, Custo UN `w-24`, Custo `w-20`)
- Font dos headers de `font-semibold` para `font-medium text-xs`
- Inputs de `h-8` para `h-7`
- Ingrediente `min-w-[200px]` para `min-w-[160px]`

### 3. Tabela de listagem de receitas (produtos finais) — `src/pages/Recipes.tsx`
- Reduzir font dos headers: adicionar `text-xs`
- Reduzir larguras mínimas das colunas levemente
- Textos de célula: `text-sm` para `text-xs` onde aplicável
- Botões de ação: `h-8 w-8` para `h-7 w-7`, ícones de `w-4 h-4` para `w-3.5 h-3.5`

### Arquivos editados
- `src/pages/Recipes.tsx`
- `src/components/recipes/IngredientsSpreadsheetTable.tsx`

