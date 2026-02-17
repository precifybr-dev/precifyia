

# Melhorias no Modulo de Combos Inteligentes

## Resumo das Mudancas

O combo gerado pela IA passara a incluir informacoes mais detalhadas e uteis: precos separados (balcao e iFood), custos discriminados por item, ingredientes do item principal na descricao, e taxas/impostos ja aplicados automaticamente.

---

## 1. Precos de Venda Separados (Balcao + iFood)

Atualmente o combo mostra apenas um "Preco Combo". A mudanca adicionara:
- **Preco Balcao**: preco sugerido para venda direta
- **Preco iFood**: preco ajustado com as taxas do iFood (comissao + repasse) ja embutidas

A IA recebera os dados de taxas/percentuais do iFood configurados na area de negocio do usuario para calcular o preco iFood automaticamente.

## 2. Custos Detalhados por Item

Atualmente o "Custo Total" mostra apenas a soma (ex: R$ 3,19). A mudanca:
- Cada item do combo passara a mostrar seu custo individual visivel
- O card expandido mostrara "Custo: R$ X,XX" ao lado de cada item
- O resumo financeiro tera breakdown: custo do principal, custo da isca, etc.

## 3. Descricao com Ingredientes do Item Principal

A IA passara a receber os ingredientes de cada receita e criara descricoes que incluam os componentes reais. Exemplo:
- Antes: "Sua fome nao tem chance! Um Xis Bacon suculento com Coca-Cola gelada"
- Depois: "Xis Bacon com hamburguer artesanal 180g, bacon crocante, queijo cheddar, alface, tomate e molho especial + Coca-Cola 310ml gelada. Combo irresistivel pro seu delivery!"

## 4. Custo por Geracao (Confirmacao)

- **Combo (generate-combo)**: ~R$ 0,005 por geracao (Gemini 2.5 Flash, ~1500 tokens)
- **Estrategia de Topo (generate-menu-strategy)**: ~R$ 0,005 por geracao (Gemini 2.5 Flash)
- Total estimado ate o momento: desprezivel (~centavos)

---

## Secao Tecnica

### Arquivo 1: `supabase/functions/generate-combo/index.ts`

**Mudanca 1 - Buscar ingredientes das receitas (apos linha 116)**:
```typescript
// Buscar ingredientes de cada receita para contexto da descricao
const recipeIds = recipes.map(r => r.id);
const { data: recipeIngredientsData } = await supabaseAdmin
  .from("recipe_ingredients")
  .select("recipe_id, ingredient_id, quantity, unit, cost, ingredients(name)")
  .in("recipe_id", recipeIds);
```

**Mudanca 2 - Buscar taxas/fees do usuario (apos profileRes)**:
```typescript
// Buscar taxas e fees do iFood configuradas
const [taxesRes, cardFeesRes] = await Promise.all([
  supabaseAdmin.from("taxes").select("*").eq("user_id", user.id),
  supabaseAdmin.from("card_fees").select("*").eq("user_id", user.id),
]);
```

**Mudanca 3 - Incluir ingredientes no contexto de receitas para a IA**:
```typescript
const recipesContext = filteredRecipes.map((r) => ({
  name: r.name,
  cost: r.cost_per_serving ?? r.total_cost,
  sellingPrice: r.selling_price || r.suggested_price,
  ifoodPrice: r.ifood_selling_price,
  servings: r.servings,
  ingredients: recipeIngredientsData
    ?.filter(ri => ri.recipe_id === r.id)
    .map(ri => `${ri.ingredients?.name} (${ri.quantity}${ri.unit})`) || [],
}));
```

**Mudanca 4 - Atualizar prompt da IA** para:
- Incluir ingredientes na descricao do combo
- Gerar dois precos: `combo_price_counter` (balcao) e `combo_price_ifood` (iFood)
- Informar as taxas do iFood configuradas pelo usuario
- Pedir breakdown de custos por item

**Mudanca 5 - Atualizar tool schema** adicionando campos:
```typescript
combo_price_counter: { type: "number", description: "Preco de venda no balcao" },
combo_price_ifood: { type: "number", description: "Preco de venda no iFood (com taxas embutidas)" },
```

**Mudanca 6 - Salvar novos campos no banco** (combo_price se mantém como o balcão, adiciona campo ifood).

### Arquivo 2: Migracao SQL

Adicionar colunas a tabela `combos`:
```sql
ALTER TABLE combos ADD COLUMN IF NOT EXISTS combo_price_ifood numeric DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS ingredients_description text;
```

### Arquivo 3: `src/hooks/useCombos.ts`

- Adicionar `combo_price_ifood` e `ingredients_description` ao tipo `Combo`
- Incluir esses campos no select

### Arquivo 4: `src/components/combos/ComboHistoryList.tsx`

**Mudanca 1 - Mostrar custo individual por item**:
Adicionar `formatCurrency(item.cost)` ao lado de cada item na lista expandida.

**Mudanca 2 - Grid financeiro expandido**:
Substituir o grid de 4 colunas por 5-6 cards:
- Individual | Preco Balcao | Preco iFood | Custo Total | Lucro | Margem

**Mudanca 3 - Exibir ingredientes na descricao**:
Se `combo.ingredients_description` existir, mostrar abaixo da descricao principal.

### Resumo de Arquivos Editados

1. `supabase/functions/generate-combo/index.ts` - Buscar ingredientes + taxas, atualizar prompt, novos campos
2. `src/hooks/useCombos.ts` - Tipos e select atualizados
3. `src/components/combos/ComboHistoryList.tsx` - UI com custos por item, precos balcao/iFood, descricao com ingredientes
4. Migracao SQL - Novas colunas na tabela `combos`

