
# Ajuste de Apresentacao e Nomenclatura da Precificacao

## Contexto

A matematica do sistema esta correta. O problema e que a apresentacao visual confunde o usuario leigo, dando sensacao de duplicidade entre "Custos de Producao (%)" e "Despesas do Negocio (ref.)". Este plano corrige apenas a camada visual, semantica e pedagogica.

## Mudancas

### 1. PricingSummaryPanel.tsx -- Ficha Tecnica

**Remover completamente o bloco "DESPESAS NEGOCIO (ref.)"** (linhas 320-336). Esse card de borda tracejada nao deveria aparecer na ficha tecnica -- despesas do negocio sao informacao gerencial da Area do Negocio, nao do produto.

**Renomear labels:**
- "LUCRO LIQUIDO REAL - LOJA" -> "LUCRO POR PRODUTO - LOJA"
- "LUCRO LIQUIDO REAL - IFOOD" -> "LUCRO POR PRODUTO - IFOOD"
- "= LUCRO LIQUIDO" -> "= LUCRO POR PRODUTO"
- Texto explicativo da Loja: "Lucro real apos custo direto, custos de producao (%) e impostos." -> "Lucro unitario apos custo direto, rateio de producao e impostos."
- Texto explicativo do iFood: "Este e o valor real que sobra apos todos os custos, despesas e impostos." -> "Lucro unitario apos taxa iFood, custo direto, rateio de producao e impostos."

**Atualizar tooltip do bloco "CUSTOS DE PRODUCAO (%)"** (linhas 301-306):
- Remover a frase sobre "despesas do negocio ja estao consideradas aqui" que causa confusao
- Usar texto educativo do briefing: "Esse valor representa quanto cada produto ajuda a pagar as contas mensais do seu negocio. Aluguel, internet, energia, sistema e outras despesas nao sao descontadas diretamente do produto -- elas sao diluidas em percentual para que cada venda pague apenas a sua parte justa."

**Remover prop `totalBusinessCostPercent`** da interface -- a ficha tecnica nao precisa mais receber esse dado.

### 2. Recipes.tsx -- Passar menos dados ao Painel

Remover a passagem da prop `totalBusinessCostPercent` ao `PricingSummaryPanel` (o calculo ja nao usa, e agora o card visual tambem sera removido).

**Renomear header da coluna na tabela:**
- Coluna "Lucro Liq. Loja" -> "Lucro/Produto"
- Coluna "Lucro Liq. iFood" -> "Lucro/Produto"

### 3. Beverages.tsx -- Mesma renomeacao

Renomear coluna "Lucro Liquido" para "Lucro/Produto" na tabela de listagem de bebidas.

### 4. BusinessArea.tsx -- Ajustes no Dashboard Gerencial

**Renomear secao "Custo Total Consolidado"** (linha 735-737):
- Titulo: "Custo Total Consolidado" -> "Custos de Producao (Rateio)"
- Subtitulo: "Impacto total dos custos e despesas sobre o preco do produto" -> "Percentual rateado sobre o faturamento, aplicado nas fichas tecnicas"

**Renomear secao "Despesas do Negocio"** (linha 689-690):
- Titulo ja esta "Despesas do Negocio" -> "Despesas Mensais do Negocio"
- Subtitulo: manter o atual + adicionar texto fixo: "Despesas do negocio sao pagas com o lucro total do mes, nao por produto individual."

**Renomear DRE:**
- "Resultado Liquido" -> "Lucro Mensal do Negocio"

### 5. SimplifiedDREBlock.tsx -- Renomear resultado

- "Resultado Liquido" -> "Lucro Mensal do Negocio"
- Adicionar texto explicativo fixo abaixo do resultado: "Despesas do negocio sao pagas com o faturamento total do mes, nao por produto individual."

### 6. TotalProductCostBlock.tsx -- Limpar confusao

**Remover referencia a "Despesas Negocio" no grid de metricas.** Esse bloco so deve mostrar custos de producao (fixos + variaveis) e o percentual resultante. As despesas do negocio vivem apenas na secao de Despesas e no DRE.

Concretamente:
- Remover a coluna "Despesas Negocio" do grid de 3 colunas (converter para grid de 2 colunas: Custos Producao + Total)
- Remover a barra de progresso com duas cores (azul + rosa) que mistura producao com despesas
- Manter apenas a barra de progresso simples mostrando o percentual de custos de producao
- Atualizar titulo: "Custo Total a Abater do Produto" -> "Custos de Producao (Rateio)"
- Atualizar subtitulo: "Percentual do preco consumido para manter o negocio" -> "Percentual do faturamento aplicado sobre cada produto"
- Remover props `businessExpensesPercent` e `averagePrice` que nao serao mais necessarias

## O que NAO muda

- Nenhum calculo matematico
- Nenhuma logica de banco de dados
- Nenhuma funcionalidade removida
- Area de Despesas continua existindo na Area do Negocio
- DRE continua funcionando
- TotalBusinessCostBlock continua existindo para gerenciar despesas

## Detalhes Tecnicos

| Arquivo | Mudanca |
|---------|---------|
| PricingSummaryPanel.tsx | Remover bloco "DESPESAS NEGOCIO (ref.)", remover prop `totalBusinessCostPercent`, renomear labels |
| Recipes.tsx | Remover prop `totalBusinessCostPercent` do PricingSummaryPanel, renomear colunas tabela |
| Beverages.tsx | Renomear coluna tabela |
| BusinessArea.tsx | Renomear secoes, adicionar texto educativo, remover props desnecessarias do TotalProductCostBlock |
| SimplifiedDREBlock.tsx | Renomear "Resultado Liquido" -> "Lucro Mensal do Negocio", adicionar texto pedagogico |
| TotalProductCostBlock.tsx | Remover coluna despesas, simplificar para 2 colunas, remover props, atualizar titulos |
