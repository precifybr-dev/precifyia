

# Confirmacao e Ajustes do Fluxo de Copia entre 3 Lojas

## Status Atual

O fluxo de copia de receitas entre lojas **ja esta implementado corretamente** e funciona para 3 lojas. A logica atual:

1. Busca ingredientes da loja destino filtrados por `store_id`
2. Calcula `destMaxCode` apenas da loja destino (independente das outras)
3. Cria ingredientes inexistentes com codigos sequenciais (`destMaxCode + 1, +2...`)
4. Mapeia IDs de ingredientes corretamente para os `recipe_ingredients`
5. Cada loja tem numeracao independente comecando do 1 (constraint `user_id, store_id, code`)

## Cenarios que ja funcionam

- Loja A -> Loja B: ingredientes copiados com codigos sequenciais da Loja B
- Loja A -> Loja C: ingredientes copiados com codigos sequenciais da Loja C
- Loja B -> Loja C: ingredientes duplicados sao detectados por nome e reutilizados

## Melhorias a aplicar

Apesar de funcional, ha pequenos ajustes para maior robustez:

### 1. Recalcular `unit_price` ao criar ingrediente na loja destino

Atualmente o `unit_price` e copiado do ingrediente original. Se o valor estiver `null` no banco de origem, ficara `null` no destino. O correto e sempre recalcular: `(purchase_price / purchase_quantity) * correction_factor`.

### 2. Tratar colisao de codigo (retry)

Se dois processos paralelos tentarem criar ingredientes ao mesmo tempo, pode haver colisao de codigo. Adicionar retry similar ao que ja existe no `handleIfoodImport` do `Ingredients.tsx`.

### 3. Corrigir warning do DialogFooter

O console mostra warning de ref no `DialogFooter`. Correcao simples com `forwardRef` ou reestruturacao do JSX.

## Arquivos modificados

1. `src/components/recipes/CopyRecipesFromStoreModal.tsx` — recalcular `unit_price`, adicionar retry em colisao de codigo, corrigir warning de ref
