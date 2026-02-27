

# Copiar Receitas de Outras Lojas

## Resumo

Adicionar um botao na pagina de Fichas Tecnicas que permite ao usuario (Pro com multiplas lojas) importar/copiar receitas de suas outras lojas para a loja ativa. O sistema busca as receitas das outras lojas, permite selecionar quais copiar, e duplica-as (com ingredientes) para a loja atual.

## Pre-requisitos

- Usuario deve ter plano Pro (multi-loja)
- Usuario deve ter mais de 1 loja cadastrada
- So copia receitas de lojas do mesmo usuario

## Implementacao

### 1. Novo componente: `CopyRecipesFromStoreModal`

Arquivo: `src/components/recipes/CopyRecipesFromStoreModal.tsx`

- Dialog/modal com dois passos:
  1. **Selecionar loja de origem**: Dropdown com as outras lojas do usuario (exclui a ativa)
  2. **Selecionar receitas**: Lista com checkboxes das receitas da loja selecionada, mostrando nome e custo por porcao
- Botao "Copiar Selecionadas" que executa a duplicacao
- Indicador de progresso durante a copia

### 2. Logica de copia

Para cada receita selecionada:
1. Buscar `recipe_ingredients` da receita original
2. Verificar se os ingredientes existem na loja destino (por nome)
   - Se existem: usar o `ingredient_id` da loja destino
   - Se nao existem: copiar o ingrediente tambem para a loja destino
3. Criar nova receita com `store_id` da loja ativa e `user_id` do usuario
4. Criar os `recipe_ingredients` vinculados a nova receita
5. Resetar `selling_price` e `ifood_selling_price` para null (mesmo padrao da duplicacao existente)

### 3. Integracao na pagina Recipes.tsx

- Adicionar botao "Copiar de outra loja" ao lado do botao "Nova Ficha Tecnica"
- Botao so aparece quando:
  - `stores.length > 1` (usuario tem mais de uma loja)
  - Respeita o limite de receitas do plano
- Importar e renderizar o `CopyRecipesFromStoreModal`
- Apos copia bem-sucedida, recarregar a lista de receitas

### 4. Verificacao de ingredientes

Ao copiar uma receita, os ingredientes podem nao existir na loja destino. A logica sera:
- Buscar ingrediente na loja destino pelo nome (case-insensitive)
- Se encontrar: reutilizar
- Se nao encontrar: criar o ingrediente na loja destino copiando os dados (nome, preco, unidade, fator de correcao, etc.)
- Recalcular custos com base nos precos dos ingredientes da loja destino

### Arquivos criados/modificados

1. **Novo**: `src/components/recipes/CopyRecipesFromStoreModal.tsx` — Modal completo com selecao de loja, selecao de receitas e logica de copia
2. **Modificado**: `src/pages/Recipes.tsx` — Adicionar botao + state do modal + integracao

### Fluxo do usuario

```text
[Pagina Fichas Tecnicas]
        |
  [Botao: Copiar de outra loja]  (visivel apenas para Pro com 2+ lojas)
        |
  [Modal abre]
        |
  [Seleciona loja de origem]
        |
  [Lista receitas da loja com checkboxes]
        |
  [Seleciona receitas desejadas]
        |
  [Clica "Copiar Selecionadas"]
        |
  [Sistema copia receitas + ingredientes]
        |
  [Toast de sucesso + lista atualizada]
```

### Consideracoes

- Nenhuma migration SQL necessaria — usa tabelas existentes (`recipes`, `recipe_ingredients`, `ingredients`)
- RLS ja garante que o usuario so acessa suas proprias lojas e dados
- Ingredientes duplicados sao evitados pela busca por nome na loja destino
- Limite de receitas do plano e respeitado (verifica antes de copiar)
