

# Vincular Taxa de Cartao a Ficha Tecnica (Somente Loja)

## Contexto

A taxa de cartao (media das taxas cadastradas em `card_fees`) deve ser descontada do lucro liquido **apenas na venda pela Loja**. No iFood, a taxa de 3,2% do cartao ja esta embutida na taxa real do iFood (comissao + pagamento + antecipacao), portanto **nao deve ser descontada novamente**.

---

## Mudancas

### 1. Backend: `supabase/functions/calculate-recipe-pricing/index.ts`

**Buscar taxa media de cartao** (apos buscar taxData, ~linha 305):
- Consultar tabela `card_fees` filtrando por `user_id`
- Calcular a media das `fee_percentage`

**Aplicar taxa de cartao SOMENTE na Loja** (linha 378):
```
Antes:  netProfitLoja = finalSellingPrice - costWithLoss - productionCost - taxes
Depois: netProfitLoja = finalSellingPrice - costWithLoss - productionCost - taxes - cardFeeValue
```

**iFood permanece inalterado** (linha 386):
```
ifoodNetProfit = ifoodNetRevenue - costWithLoss - ifoodProductionCost - ifoodTaxValue
(sem taxa de cartao - ja esta embutida na taxa iFood)
```

**Novos campos no response**:
- `average_card_fee` (percentual medio)
- `card_fee_value_loja` (valor em R$ descontado)

**Adicionar ao fail-safe gate** para validacao.

**Adicionar ao input_snapshot** do calculation_history.

### 2. Frontend: `src/hooks/useRecipePricing.ts`

Adicionar ao tipo `RecipePricingResult`:
- `average_card_fee: number`
- `card_fee_value_loja: number`

### 3. Frontend: `src/components/recipes/PricingSummaryPanel.tsx`

**Loja - nova linha "(-) Taxa Cartao"**:
- Exibir entre Impostos e Lucro Liquido
- Mostrar valor em R$ e percentual
- Cor: roxo/violet para diferenciar visualmente

**iFood - sem mudanca**:
- Manter calculo atual (taxa de cartao ja embutida no iFood)
- Adicionar tooltip explicativo: "A taxa de cartao ja esta incluida na taxa iFood"

**Atualizar tooltip "Como o lucro e calculado"** na Loja:
- Incluir "Taxas de cartao" na lista de deducoes

### 4. Area de Negocio: `src/pages/BusinessArea.tsx`

- Remover campo `tax_regime` duplicado do formulario de Configuracoes (ja existe no bloco de Impostos)
- Remover campo `monthly_revenue` duplicado do formulario (ja existe no MonthlyRevenueBlock)
- Remover subtotal inline duplicado de custos de producao (~linhas 623-642)

### 5. DRE: `src/components/business/SimplifiedDREBlock.tsx`

Adicionar **Ponto de Equilibrio** apos o Lucro Mensal:
- Formula: `PE = Despesas Fixas / (1 - Despesas Variaveis%/100)`
- Exibir: "Faturamento minimo para cobrir custos: R$ X.XXX"

---

## Secao Tecnica - Formulas Finais

```text
LOJA:
  Preco Venda ........................ R$ 30,00
  (-) Custo c/ Perda ................. R$ 9,00   (CMV)
  (-) Custos Producao (rateio) ....... R$ 1,50   (5%)
  (-) Impostos ....................... R$ 1,80   (6%)
  (-) Taxa Cartao .................... R$ 0,60   (2%)  << NOVO
  (=) Lucro Liquido .................. R$ 17,10

IFOOD:
  Preco iFood ........................ R$ 41,00
  (-) Taxa iFood ..................... R$ 11,19  (27,29% - JA INCLUI CARTAO)
  (-) Custo c/ Perda ................. R$ 9,00
  (-) Custos Producao ................ R$ 1,49
  (-) Impostos ....................... R$ 1,79
  (=) Lucro Liquido .................. R$ 17,53
  * Taxa de cartao NAO descontada (ja embutida no iFood)
```

## Arquivos Editados

1. `supabase/functions/calculate-recipe-pricing/index.ts` - Buscar e aplicar taxa cartao (somente Loja)
2. `src/hooks/useRecipePricing.ts` - Novos campos no tipo
3. `src/components/recipes/PricingSummaryPanel.tsx` - Exibir taxa cartao na Loja + tooltip iFood
4. `src/pages/BusinessArea.tsx` - Remover duplicatas
5. `src/components/business/SimplifiedDREBlock.tsx` - Ponto de equilibrio

