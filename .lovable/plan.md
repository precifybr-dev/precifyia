
# Redesenho da Ficha Tecnica - Layout de Planilha Profissional

## Visao Geral

Transformar o formulario atual da Ficha Tecnica em um layout profissional estilo planilha, com tabela de insumos na parte superior e painel de precificacao organizado em blocos abaixo (otimizado para mobile).

---

## Estrutura Visual Final

```text
+------------------------------------------------------------------+
|  [NOME DO PRODUTO]     [RENDIMENTO]    [CMV DESEJADO %]          |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  TABELA DE INSUMOS (HEADER VERMELHO ESCURO)                      |
+------------------------------------------------------------------+
| Codigo | INGREDIENTES | QTD LIQ | UND | FAT.C | CUSTO LIQ | TOTAL|
|--------|--------------|---------|-----|-------|-----------|------|
| [1]    | Farinha...   | 0.5     | kg  | 1.00  | R$ 5,00   | 2,50 |
| [2]    | Acucar...    | 0.2     | kg  | 1.05  | R$ 4,00   | 0,84 |
| [+]    | Buscar...    |         |     |       |           |      |
+------------------------------------------------------------------+
|  [+ Adicionar ingrediente]                                       |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                    PAINEL DE PRECIFICACAO                        |
+------------------------------------------------------------------+
|  +----------------------------+  +-----------------------------+ |
|  | PRECO DE VENDA | R$ 19,50  |  | CMV          |    36%       | |
|  | (editavel)     |           |  | (calculado)  |              | |
|  +----------------------------+  +-----------------------------+ |
|  | CUSTO RECEITA  | R$  6,93  |  | CMV DESEJADO |    35%       | |
|  | CUSTO C/ PERDA | R$  6,93  |  | (editavel)   |              | |
|  +----------------------------+  +-----------------------------+ |
|                                  | CALCULADORA PRECO IFOOD     | |
|  +----------------------------+  | Preco Base   | R$ 19,50     | |
|  | MARGEM APROX % | 29,45%    |  | Taxa iFood   | 28%          | |
|  | MARGEM APROX R$| R$  5,74  |  | (editavel)   |              | |
|  +----------------------------+  | Valor Final  | R$ 27,08     | |
|                                  +-----------------------------+ |
|  +----------------------------+                                  |
|  | PRECO SUGERIDO | R$ 19,81  |                                  |
|  | PRECO IFOOD    | R$ 27,51  |                                  |
|  +----------------------------+                                  |
|                                                                   |
|  +----------------------------+                                  |
|  | PROMOCAO       |    5%     |                                  |
|  | (editavel)     |           |                                  |
|  | PRECO C/ DESC  | R$ 18,53  |                                  |
|  +----------------------------+                                  |
|                                                                   |
|  +----------------------------+                                  |
|  | CUSTO FIXO+VAR |   37%     |                                  |
|  +----------------------------+                                  |
+------------------------------------------------------------------+
```

---

## Componentes a Criar

### 1. IngredientsSpreadsheetTable.tsx

Tabela de insumos estilo planilha Excel com:
- Header vermelho escuro (`bg-red-900`) com texto branco
- Colunas: Codigo, INGREDIENTES, QTD LIQ, UND, FAT.C, CUSTO LIQ KG/UN, CUSTO TOTAL
- Linhas zebradas para leitura facil
- Bolinha de cor ao lado do codigo
- Campo de busca integrado na linha
- Botao de remover linha (lixeira)

### 2. PricingSummaryPanel.tsx

Painel de precificacao organizado em blocos de cards:

**Bloco 1 - Preco de Venda + CMV**
- Preco de Venda (EDITAVEL - com aviso visual se vazio)
- CMV Atual (calculado automaticamente, NAO EDITAVEL)

**Bloco 2 - Custos + CMV Desejado**
- Custo Receita (soma insumos)
- Custo com % Perda
- CMV Desejado (EDITAVEL - pre-preenchido do perfil)

**Bloco 3 - Margens**
- Margem Aprox % (margem bruta)
- Margem Aprox R$

**Bloco 4 - Precos Finais**
- Preco Sugerido (calculado)
- Preco iFood (calculado)

**Bloco 5 - Calculadora iFood**
- Preco Base (usa preco de venda)
- Taxa iFood (EDITAVEL localmente)
- Valor Final iFood

**Bloco 6 - Promocao**
- Desconto % (EDITAVEL - padrao 5%)
- Preco com Desconto

**Bloco 7 - Custo do Negocio**
- Custo Fixo + Variavel %

---

## Campos e Comportamentos

### Campos EDITAVEIS (com aviso visual quando vazios)

| Campo | Padrao | Aviso Visual |
|-------|--------|--------------|
| Preco de Venda | Vazio (usa sugerido se vazio) | SIM - "Informe o preco" |
| CMV Desejado | Herda do perfil (ex: 35%) | SIM - "Defina o CMV" |
| % Desconto (Promocao) | 5% | SIM - se zerado |
| Taxa iFood (local) | Herda do perfil | SIM - se nao configurado |
| % Perda | 0% | NAO (opcional) |

### Campos CALCULADOS (NAO editaveis)

| Campo | Formula |
|-------|---------|
| Custo Receita | Soma dos custos dos insumos |
| Custo com Perda | Custo Receita x (1 + %Perda/100) |
| Preco Sugerido | Custo com Perda / (CMV Desejado / 100) |
| CMV Atual | (Custo com Perda / Preco de Venda) x 100 |
| Preco com Desconto | Preco de Venda x (1 - %Desconto/100) |
| Preco Final iFood | Preco de Venda / (1 - Taxa iFood/100) |
| Margem Bruta R$ | Preco de Venda - Custo com Perda |
| Margem Bruta % | (Margem R$ / Preco de Venda) x 100 |

---

## Secao Tecnica

### Novos Estados no Recipes.tsx

```typescript
// Preco de Venda manual (usuario pode editar)
const [sellingPrice, setSellingPrice] = useState("");

// Percentual de perda (padrao 0%, sem aviso)
const [lossPercent, setLossPercent] = useState("0");

// Promocao (padrao 5%)
const [discountPercent, setDiscountPercent] = useState("5");

// Taxa iFood local (editavel no bloco, nao afeta global)
const [localIfoodRate, setLocalIfoodRate] = useState("");
```

### Formulas de Calculo Atualizadas

```typescript
// Custo com perda
const lossMultiplier = 1 + (parseFloat(lossPercent) || 0) / 100;
const costWithLoss = totalCostPerServing * lossMultiplier;

// Preco sugerido (baseado no CMV desejado)
const cmvDesired = parseFloat(cmvTarget) || 30;
const suggestedPrice = cmvDesired > 0 && cmvDesired < 100 
  ? costWithLoss / (cmvDesired / 100) 
  : costWithLoss;

// Preco de venda final (manual ou sugerido se vazio)
const finalSellingPrice = parseFloat(sellingPrice) || suggestedPrice;

// CMV Atual (calculado do preco real)
const actualCMV = finalSellingPrice > 0 
  ? (costWithLoss / finalSellingPrice) * 100 
  : 0;

// Preco com desconto (promocao)
const discountedPrice = finalSellingPrice * (1 - (parseFloat(discountPercent) || 0) / 100);

// Preco iFood (usa taxa local ou global)
const effectiveIfoodRate = parseFloat(localIfoodRate) || ifoodRealPercentage || 0;
const ifoodPrice = effectiveIfoodRate > 0 && effectiveIfoodRate < 100
  ? finalSellingPrice / (1 - effectiveIfoodRate / 100)
  : finalSellingPrice;

// Margens brutas
const grossMargin = finalSellingPrice - costWithLoss;
const grossMarginPercent = finalSellingPrice > 0 
  ? (grossMargin / finalSellingPrice) * 100 
  : 0;
```

### Colunas da Tabela de Insumos

A tabela tera as seguintes colunas com dados:

| Coluna | Origem | Tipo |
|--------|--------|------|
| Codigo | `ingredient.code` + `ColorDot` | Display |
| INGREDIENTES | `IngredientSelector` | Input/Search |
| QTD LIQ | `ing.quantity` | Input numerico |
| UND | `ing.unit` | Select (g, kg, ml, l, un) |
| FAT.C | `ingredient.correction_factor` | Display (herdado) |
| CUSTO LIQ KG/UN | `ingredient.unit_price` | Display |
| CUSTO TOTAL | `ing.cost` (calculado) | Display |

### Estilizacao CSS/Tailwind

| Elemento | Classe |
|----------|--------|
| Header tabela | `bg-red-900 text-white` |
| Linhas pares | `bg-white` |
| Linhas impares | `bg-gray-50` |
| Campos editaveis | `border-2 border-primary/30` |
| Aviso campo vazio | `text-muted-foreground animate-pulse text-xs` |
| Valores calculados | `bg-muted font-mono` |
| Bloco cards | `rounded-lg border p-4` |

### Responsividade

- Mobile: Tabela com scroll horizontal, blocos em 1 coluna vertical
- Tablet: Grid 2 colunas para blocos
- Desktop: Grid 2 colunas lado a lado

---

## Arquivos a Criar

1. `src/components/recipes/IngredientsSpreadsheetTable.tsx`
2. `src/components/recipes/PricingSummaryPanel.tsx`

## Arquivos a Modificar

1. `src/pages/Recipes.tsx`
   - Adicionar novos estados (sellingPrice, lossPercent, discountPercent, localIfoodRate)
   - Implementar formulas atualizadas
   - Substituir layout atual pelos novos componentes
   - Carregar correction_factor dos insumos para exibir na tabela

2. `src/components/recipes/IfoodPriceCalculator.tsx`
   - Adicionar prop `editableRate` para permitir edicao local
   - Renderizar dentro do PricingSummaryPanel como bloco integrado

---

## Regras de Negocio (Resumo)

1. **CMV Atual** - sempre calculado automaticamente baseado no Preco de Venda
2. **CMV Desejado** - editavel, define o Preco Sugerido
3. **Preco de Venda** - editavel, usuario decide o preco final
4. **% Perda** - opcional, padrao 0, sem aviso visual
5. **Promocao** - editavel, padrao 5%
6. **Taxa iFood** - editavel localmente, nao altera perfil global
7. **Preco iFood** usa Preco de Venda (nao preco com desconto)
8. **Repasse de Embalagem** - REMOVIDO conforme solicitado
