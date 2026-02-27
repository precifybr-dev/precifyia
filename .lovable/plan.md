

# Embalagens como Ficha Tecnica (com Insumos Cadastrados)

## Resumo

Transformar o cadastro de embalagens para funcionar como uma ficha tecnica: em vez de digitar nomes e custos manualmente, o usuario seleciona insumos ja cadastrados na loja (ex: "Marmita PP", "Tampa", "Sacola") e monta a embalagem com quantidades. O custo e puxado automaticamente do insumo. Depois, a embalagem montada e vinculada na ficha tecnica final.

## O que muda

### 1. Banco de dados - Adicionar `ingredient_id` na tabela `packaging_items`

- Adicionar coluna `ingredient_id` (UUID, FK para `ingredients`, nullable) na tabela `packaging_items`
- Manter `item_name` e `unit_cost` para compatibilidade (preenchidos automaticamente do ingrediente selecionado)
- Quando o usuario seleciona um insumo, o `item_name` recebe o nome e `unit_cost` recebe o `unit_price` do insumo
- RLS ja esta coberta pois as policies existentes verificam o `packaging_id` -> `packagings.user_id`

### 2. Pagina de Embalagens - Substituir inputs manuais pelo IngredientSelector

- Remover a distincao "simples vs combo" (toda embalagem passa a ser uma lista de insumos, como uma ficha tecnica)
- No formulario de criacao/edicao:
  - Usar o componente `IngredientSelector` (ja existente) para buscar insumos por codigo ou nome
  - Ao selecionar um insumo, preencher automaticamente nome, unidade e custo unitario
  - Permitir ajustar a quantidade
  - Exibir subtotal (quantidade x custo) por linha
  - Exibir custo total da embalagem no rodape
- Manter acoes existentes: duplicar, ativar/inativar, copiar entre lojas, excluir

### 3. Hook usePackagings - Adaptar para salvar `ingredient_id`

- Ao criar/atualizar itens, salvar o `ingredient_id` junto com `item_name` e `unit_cost`
- Ao buscar embalagens, trazer o `ingredient_id` nos itens para exibir corretamente no selector
- Funcao de duplicar e copiar entre lojas: manter mapeamento de ingredientes (similar a copia de sub-receitas)

### 4. Integracao com Ficha Tecnica (sem alteracao)

- A ficha tecnica ja seleciona embalagens ativas via dropdown - isso continua igual
- O custo da embalagem ja e calculado automaticamente via triggers - isso continua igual

## Estrutura visual do formulario

```text
Nova Embalagem
+-------------------------------------------+
| Nome: [Marmita Completa G              ]  |
| Categoria: [Descartaveis               ]  |
| Descricao: [                           ]  |
+-------------------------------------------+
| Insumos da Embalagem                      |
| [Buscar insumo por codigo ou nome...   ]  |
|                                           |
| #  | Insumo        | Qtd | Custo | Sub   |
| 45 | Marmita G     |  1  | 0.85  | 0.85  |
| 46 | Tampa G       |  1  | 0.35  | 0.35  |
| 47 | Sacola kraft   |  1  | 0.50  | 0.50  |
|                                           |
|              Total: R$ 1,70               |
+-------------------------------------------+
| [Cancelar]              [Criar]           |
+-------------------------------------------+
```

## Arquivos modificados

1. **Migracao SQL** - Adicionar `ingredient_id` na `packaging_items`
2. **`src/hooks/usePackagings.ts`** - Adaptar interfaces e CRUD para incluir `ingredient_id`
3. **`src/pages/Packagings.tsx`** - Redesign do formulario usando `IngredientSelector`, remover tipo simples/combo, listar insumos como ficha tecnica

## O que NAO muda

- Triggers de calculo automatico (`sync_packaging_cost`, `update_packaging_total`) continuam funcionando
- RLS policies existentes continuam validas
- Vinculacao de embalagem na ficha tecnica (dropdown no `Recipes.tsx`) continua igual
- Copia entre lojas continua funcionando
- Nenhum calculo existente e alterado
