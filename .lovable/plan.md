

# Alerta Inteligente de Categorização de Custos e Despesas

## Visao Geral

Criar um sistema de alerta educativo que orienta o usuario quando ele cadastra um custo ou despesa em uma categoria potencialmente incorreta. O alerta e apenas informativo -- nunca bloqueia ou corrige automaticamente.

## Arquitetura

A solucao e 100% client-side, sem banco de dados, sem API. Os grupos semanticos ficam em um arquivo utilitario e a verificacao e feita via normalizacao de texto (funcao `normalizeText` ja existente).

## Arquivos

### 1. Novo: `src/lib/cost-category-hints.ts`

Arquivo utilitario contendo:

- **4 mapas de grupos semanticos** (A, B, C, D) com arrays de palavras-chave
- **Funcao `detectCategoryMismatch`** que recebe o texto digitado e a categoria atual, retorna o alerta (ou null)

Cada grupo:
- **A (despesas_fixas)**: aluguel, condominio, iptu, funcionario, salario, folha, pro-labore, beneficios, vale transporte, vale refeicao, encargos, fgts, inss, sindicato, agua, luz, energia, gas fixo, internet, telefone, celular, limpeza, seguranca, vigilancia, contador, contabilidade, juridico, advogado, consultoria, despachante, sistema, software, erp, mensalidade sistema, parcela maquina, financiamento, emprestimo, leasing, juros fixos, tarifa bancaria
- **B (despesas_variaveis)**: marketing, anuncios, trafego, facebook ads, google ads, promocao, publicidade, comissao vendedor, comissoes, taxa cartao, taxa maquininha, taxa banco, taxas financeiras, antecipacao, imposto sobre venda, icms, iss, pis, cofins, simples nacional, taxas variaveis, taxas operacionais
- **C (custos_fixos_producao)**: depreciacao, desgaste equipamento, maquina producao, equipamento producao, manutencao equipamento, contrato minimo producao, licenca producao, custo fixo por item, taxa fixa producao, estrutura producao, custo base producao
- **D (custos_variaveis_producao)**: embalagem, caixa, papel, saco, etiqueta, perda, desperdicio, quebra, insumo, ingrediente, materia-prima, taxa ifood, comissao ifood, taxa por pedido, taxa entrega, motoboy, cupom, desconto, taxa variavel por item

Logica da funcao:
1. Normaliza o texto com `normalizeText` (ja existe)
2. Verifica correspondencia por palavra-chave/radical em cada grupo
3. Se o grupo detectado != categoria atual, retorna objeto com: `detectedGroup`, `suggestedCategoryName`, `message`
4. Se nao ha conflito ou nao ha match, retorna `null`

### 2. Novo: `src/components/business/CategoryMismatchAlert.tsx`

Componente visual leve que exibe o alerta amarelo com icone de atencao. Recebe as props:
- `inputText: string`
- `currentCategory: string` (ex: "custos_fixos_producao")

Internamente chama `detectCategoryMismatch` e renderiza o alerta apenas quando ha conflito. Usa `Alert` do shadcn/ui com variante amarela.

### 3. Modificar: `src/components/business/FixedCostsBlock.tsx`

- Importar `CategoryMismatchAlert`
- Adicionar o componente logo abaixo do input de nome no formulario de adicao (linha ~253)
- Prop: `currentCategory="custos_fixos_producao"`, `inputText={newCost.name}`

### 4. Modificar: `src/components/business/VariableCostsBlock.tsx`

- Mesmo padrao: adicionar `CategoryMismatchAlert` abaixo do input de nome (linha ~253)
- Prop: `currentCategory="custos_variaveis_producao"`

### 5. Modificar: `src/components/business/FixedExpensesBlock.tsx`

- Mesmo padrao (linha ~226)
- Prop: `currentCategory="despesas_fixas"`

### 6. Modificar: `src/components/business/VariableExpensesBlock.tsx`

- Mesmo padrao (linha ~272)
- Prop: `currentCategory="despesas_variaveis"`

## Comportamento do Alerta

- Aparece em tempo real enquanto o usuario digita (sem debounce necessario, pois e apenas uma comparacao de string local)
- Texto do alerta segue o formato:

> **Atencao:** "Aluguel" e normalmente uma **Despesa Fixa do Negocio**, nao um Custo de Producao. Custos de producao sao gastos diretamente ligados a fabricacao do produto. Voce pode continuar se desejar.

- Cor amarela/amber com icone `AlertTriangle`
- Desaparece quando o campo fica vazio ou quando nao ha conflito
- Nunca bloqueia a acao de "Adicionar"

## Detalhes Tecnicos

| Item | Detalhe |
|------|---------|
| Peso no bundle | Minimo -- apenas um arquivo de constantes + componente leve |
| Chamadas ao banco | Zero |
| Performance | Comparacao de string normalizada, O(n) no numero de keywords (~80 termos) |
| Escalabilidade | Adicionar novos termos = adicionar string no array |
| Normalizacao | Usa `normalizeText` existente em `src/lib/utils.ts` |

