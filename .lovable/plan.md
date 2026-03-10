

## Plano: Reduzir espaçamentos na Ficha Técnica e aproximar Rendimento do Nome

### 1. Ficha Técnica — reduzir espaço entre blocos (`src/pages/Recipes.tsx`)
- Trocar todos os `mb-4` internos do formulário para `mb-2` (entre: header → dica → grid nome/rendimento → tabela insumos → embalagem → pricing)
- Manter `p-4` do card externo

### 2. Listagem de receitas — Rendimento junto do Nome (`src/pages/Recipes.tsx`)
- Remover a coluna separada "Rend." da tabela
- Exibir o rendimento como badge/texto secundário ao lado do nome do produto na mesma célula:
  ```
  X-Bacon Especial  (rend. 2)
  ```
- Isso libera uma coluna e aproxima visualmente as duas informações

### 3. Grid Nome + Rendimento + CMV no formulário (`src/pages/Recipes.tsx`)
- Mudar o grid de `sm:grid-cols-3 gap-3` para layout inline: Nome ocupa mais espaço (`col-span-2`), Rendimento e CMV ficam menores lado a lado
- Grid: `grid-cols-[1fr_auto_auto] gap-2` para manter tudo numa linha compacta

### Arquivos editados
- `src/pages/Recipes.tsx`

