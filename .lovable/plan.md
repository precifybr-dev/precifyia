

# Plano: Ajustar CMV e Adicionar Lucro Liquido Real (Loja + iFood)

## Entendimento do Problema

Apos analisar a imagem de referencia e o codigo atual, identifiquei as seguintes correcoes necessarias:

### CMV - Correcao de Nomenclatura e Logica

| Atual (incorreto) | Correto |
|------------------|---------|
| CMV (calculado) - editavel pelo usuario | CMV (resultado do preco praticado) - NAO editavel |
| CMV Desejado - editavel | CMV DESEJADO - editavel (meta do usuario) |

**CMV Praticado** (ou simplesmente "CMV") e o resultado automatico de:
```
CMV = Custo da Receita / Preco de Venda * 100
```

Este valor serve para comparar com o CMV Desejado e ver se o preco praticado esta dentro da meta.

### Lucro Liquido Real - Dois Cenarios

O usuario quer ver o lucro liquido real para:
1. **Venda Direta (Loja)** - Preco de venda menos custos
2. **Venda iFood** - Preco iFood menos custos (considerando a taxa do iFood)

---

## Alteracoes Planejadas

### Arquivo: `src/components/recipes/PricingSummaryPanel.tsx`

#### 1. Reorganizar Bloco CMV

**Layout atual:**
```
[CMV calculado - 38%]  ← bloco separado
[CMV Desejado - input editavel]  ← outro bloco
```

**Novo layout (igual a imagem de referencia):**
```
+----------------------------------+
|  CMV                    38%      |  ← calculado automatico, NAO editavel
|                                  |
|  CMV DESEJADO           35%      |  ← input editavel
+----------------------------------+
```

- Juntar em um unico card
- CMV praticado em cima (resultado automatico, sem input)
- CMV Desejado embaixo (com input editavel)
- Destacar visualmente se CMV praticado esta acima ou abaixo do desejado

#### 2. Adicionar Bloco "Lucro Liquido Real - Loja"

Novo card mostrando:
```
+------------------------------------------+
|  LUCRO LIQUIDO REAL - LOJA               |
|                                          |
|  Preco de Venda           R$ 31,00       |
|  (-) Custo c/ Perda       R$ 11,79  38%  |
|  (-) Custos Fix+Var       R$  8,99  29%  |
|  ----------------------------------------|
|  = LUCRO LIQUIDO          R$ 10,22  33%  |
+------------------------------------------+
```

**Formula:**
```typescript
const effectivePrice = parseFloat(sellingPrice) || suggestedPrice;
const businessCostValue = effectivePrice * (totalBusinessCostPercent || 0) / 100;
const netProfit = effectivePrice - costWithLoss - businessCostValue;
const netProfitPercent = effectivePrice > 0 ? (netProfit / effectivePrice) * 100 : 0;
```

#### 3. Adicionar Bloco "Lucro Liquido Real - iFood"

Novo card mostrando:
```
+------------------------------------------+
|  LUCRO LIQUIDO REAL - IFOOD              |
|                                          |
|  Preco iFood              R$ 43,06       |
|  (-) Taxa iFood           R$ 12,06  28%  |
|  (-) Custo c/ Perda       R$ 11,79       |
|  (-) Custos Fix+Var       R$ 12,49  29%  |
|  ----------------------------------------|
|  = LUCRO LIQUIDO          R$  6,72  16%  |
+------------------------------------------+
```

**Formula iFood:**
```typescript
const ifoodFeeValue = ifoodPrice * (effectiveIfoodRate / 100);
const ifoodNetRevenue = ifoodPrice - ifoodFeeValue; // O que voce recebe do iFood
const ifoodBusinessCost = ifoodNetRevenue * (totalBusinessCostPercent || 0) / 100;
const ifoodNetProfit = ifoodNetRevenue - costWithLoss - ifoodBusinessCost;
const ifoodNetProfitPercent = ifoodPrice > 0 ? (ifoodNetProfit / ifoodPrice) * 100 : 0;
```

---

## Layout Final do Painel

```
+------------------+------------------+
| PRECO DE VENDA   | CMV        38%   |
| R$ 31,00         | CMV DESEJ  35%   |
+------------------+------------------+
| CUSTO RECEITA    | CALC. IFOOD      |
| R$ 11,79         | Preco Base       |
| CUSTO C/ PERDA   | Taxa: 28%        |
| R$ 11,79         | Valor: R$ 43,06  |
+------------------+------------------+
| MARGENS          |                  |
| 26,96% / R$ 8,36 |                  |
+------------------+------------------+
| PRECO SUGERIDO   |                  |
| R$ 33,70         |                  |
| PRECO IFOOD      |                  |
| R$ 46,80         |                  |
+------------------+------------------+
| PROMOCAO   5%    | CUSTO FIX+VAR    |
| R$ 29,45         | 29%              |
+------------------+------------------+

=== FULL WIDTH ===

+------------------------------------------+
|  LUCRO LIQUIDO REAL - LOJA               |
|  Preco Venda      R$ 31,00               |
|  (-) Custo        R$ 11,79    38%        |
|  (-) Fix+Var      R$  8,99    29%        |
|  = LUCRO          R$ 10,22    33%        |
+------------------------------------------+

+------------------------------------------+
|  LUCRO LIQUIDO REAL - IFOOD              |
|  Preco iFood      R$ 43,06               |
|  (-) Taxa iFood   R$ 12,06    28%        |
|  (-) Custo        R$ 11,79               |
|  (-) Fix+Var      R$ 12,49    29%        |
|  = LUCRO          R$  6,72    16%        |
+------------------------------------------+
```

---

## Detalhes Tecnicos

### Cores e Indicadores Visuais

- **CMV Praticado vs Desejado:**
  - Verde se CMV praticado <= CMV desejado (dentro da meta)
  - Amarelo/Vermelho se CMV praticado > CMV desejado (acima da meta)

- **Lucro Liquido:**
  - Verde se positivo
  - Vermelho se negativo

### Importar Icone Adicional

Adicionar `Wallet` do lucide-react para o bloco de lucro liquido.

---

## Resumo das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| Bloco CMV | Juntar CMV calculado + CMV Desejado em um unico card. CMV calculado NAO e editavel |
| Novo Bloco | Lucro Liquido Real - Loja (full width) |
| Novo Bloco | Lucro Liquido Real - iFood (full width) |

