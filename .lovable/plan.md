

# Embalagem dentro da Ficha Tecnica - Checkbox + CMV

## Resumo

Substituir a secao de Embalagem em Accordion (atual) por um checkbox logo abaixo da tabela de insumos. Se o usuario marcar "Sim, quero adicionar embalagem", aparece o campo de busca de embalagens cadastradas. A embalagem selecionada passa a fazer parte do CMV (custo total) da ficha tecnica.

## Mudancas

### 1. Novo estado `includePackaging` (boolean)

- Adicionar estado `includePackaging` no formulario da ficha tecnica
- Quando `false`: nenhum campo de embalagem aparece
- Quando `true`: exibe dropdown de embalagens e torna selecao obrigatoria
- Ao editar uma ficha que ja tem `packaging_id`, setar `includePackaging = true` automaticamente

### 2. UI - Checkbox + Select abaixo dos insumos

Posicao: logo apos a `IngredientsSpreadsheetTable` (linha ~1094), antes do `PricingSummaryPanel`.

```text
[x] Deseja adicionar embalagem a este produto?

Se marcado:
+---------------------------------------+
| Selecionar embalagem... [dropdown]    |
| Marmita Completa G - R$ 1,70          |
+---------------------------------------+
| Custo embalagem: R$ 1,70              |
| % sobre preco: 5.2%                  |
+---------------------------------------+
```

Se desmarcado: campo some e `selectedPackagingId` volta para `null`.

### 3. Embalagem como parte do CMV

- O custo da embalagem sera somado ao custo dos ingredientes para formar o CMV total
- Variavel `totalCostWithPackaging` = `ingredientsCost` + custo da embalagem selecionada
- Esse valor total e exibido como "Custo Total (CMV)" no painel de precificacao
- O `cost_per_serving` salvo no banco incluira o custo da embalagem

### 4. Validacao ao salvar

- Se `includePackaging === true` e `selectedPackagingId === null`: bloquear salvamento com toast de erro "Selecione uma embalagem ou desmarque a opcao"

### 5. Remover Accordion de Embalagem

- Remover o `AccordionItem value="packaging"` (linhas 1136-1197)
- Manter o `AccordionItem value="market"` (Analise de Mercado) como esta

### 6. Duplicacao de ficha tecnica

- Ao duplicar, copiar tambem o `packaging_id` e o estado `includePackaging` (se a ficha original tinha embalagem, a copia tambem tera)

## Arquivo modificado

- `src/pages/Recipes.tsx`: Adicionar checkbox, mover logica de embalagem, incluir custo no CMV, remover Accordion de embalagem, validacao no save

## O que NAO muda

- `usePackagings.ts` - nenhuma alteracao
- Backend de precificacao - nenhuma alteracao (custo da embalagem e somado client-side antes de exibir)
- Banco de dados - `packaging_id` na tabela `recipes` ja existe
- Menu de Embalagens - continua igual
- Analise de Mercado - continua no Accordion

