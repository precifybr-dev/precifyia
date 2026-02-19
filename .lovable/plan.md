
# Corrigir Inconsistencias entre Tabela de Planos e Codigo Real

## Diagnostico Completo

Apos auditoria detalhada, encontrei **7 inconsistencias** entre o que a tabela de comparacao promete e o que o sistema realmente faz:

| Recurso | Tabela promete | Realidade no codigo | Gravidade |
|---------|---------------|---------------------|-----------|
| Fichas tecnicas (Free) | 2 | Codigo hardcoded permite **3** | Media |
| Insumos cadastrados | Free=35, Essencial=100, Pro=ilimitados | **Sem limite nenhum** implementado | Alta |
| Importacao de planilha (Free) | "1 unica, ate 35 insumos" | **Bloqueada** (enabled=false no banco) | Alta |
| Sub-receitas | Bloqueado no Free | **Sem verificacao** no frontend/backend | Media |
| Multi-loja (Pro) | "Ate 3 lojas" | Habilitado mas **sem limite de 3** | Media |
| Dashboard diferenciado | Basico/Completo/Avancado+DRE | **Todos veem o mesmo dashboard** | Baixa |
| Exportacao de dados | Bloqueado no Free | **Sem verificacao** no frontend | Media |

Tambem existe uma entrada duplicada no banco: `combos_ai` com plan="basico" (acentuado) alem de plan="basic".

---

## Plano de Correcao

### Fase 1 -- Corrigir banco de dados (plan_features)

**1.1** Adicionar features faltantes: `recipes` e `ingredients` na tabela plan_features com os limites corretos

| Feature | Free | Essencial (basic) | Pro |
|---------|------|-------------------|-----|
| recipes | enabled=true, limit=2 | enabled=true, limit=8 | enabled=true, limit=null |
| ingredients | enabled=true, limit=35 | enabled=true, limit=100 | enabled=true, limit=null |

**1.2** Corrigir `spreadsheet_import` para Free: mudar de enabled=false para enabled=true, usage_limit=1

**1.3** Adicionar usage_limit=3 para `multi_store` no plano Pro

**1.4** Remover entrada duplicada `combos_ai` com plan="basico"

### Fase 2 -- Corrigir codigo do frontend

**2.1 Recipes.tsx** -- Remover limite hardcoded e usar plan_features do banco

Trocar o `getRecipeLimit` hardcoded por consulta ao plan_features via `usePlanFeatures` ou consulta direta. Free passa de 3 para 2 (conforme tabela).

**2.2 Ingredients.tsx** -- Adicionar limite de insumos por plano

Adicionar verificacao antes de criar novo insumo: contar quantos ja tem e comparar com o limite do plano (35/100/ilimitado).

**2.3 SubRecipes.tsx** -- Adicionar gate para sub-receitas

Verificar se `sub_recipes` esta habilitado no plano do usuario antes de permitir criar sub-receitas. Mostrar PlanUpgradePrompt quando bloqueado.

**2.4 Multi-loja** -- Adicionar limite de 3 lojas no Pro

No `CreateStoreModal.tsx` ou `StoreContext.tsx`, verificar se o numero de lojas ja atingiu 3 antes de permitir criar nova loja.

**2.5 Exportacao** -- Verificar feature gate na pagina BackupRestore

### Fase 3 -- Corrigir tabela de comparacao

**3.1** Atualizar `PlanComparisonTable.tsx` para refletir a realidade corrigida (a tabela fica como esta, pois vamos ajustar o codigo para cumprir o que ela promete)

### Fase 4 -- Corrigir MyPlan.tsx

**4.1** Ajustar `featureKey` no MyPlan para usar os nomes corretos do banco:
- "recipes" (novo), "ingredients" (novo)
- "menu_analysis" (em vez de "analyze-menu")
- "combos_ai" (em vez de "generate-combo")
- "spreadsheet_import" (em vez de "spreadsheet-import")

---

## Detalhes Tecnicos

### Migration SQL

```text
-- Adicionar recipes e ingredients
INSERT INTO plan_features (plan, feature, enabled, usage_limit) VALUES
  ('free', 'recipes', true, 2),
  ('basic', 'recipes', true, 8),
  ('pro', 'recipes', true, NULL),
  ('free', 'ingredients', true, 35),
  ('basic', 'ingredients', true, 100),
  ('pro', 'ingredients', true, NULL);

-- Corrigir spreadsheet_import Free: permitir 1 uso
UPDATE plan_features SET enabled = true, usage_limit = 1 
  WHERE plan = 'free' AND feature = 'spreadsheet_import';

-- Adicionar limite de 3 lojas no Pro
UPDATE plan_features SET usage_limit = 3 
  WHERE plan = 'pro' AND feature = 'multi_store';

-- Remover duplicata basico (acentuado)
DELETE FROM plan_features WHERE plan = 'básico';
```

### Recipes.tsx

Remover o `getRecipeLimit` hardcoded (linhas 177-189) e substituir por consulta ao hook `usePlanFeatures`:

```text
const { getFeatureLimit } = usePlanFeatures();
const recipeLimit = getFeatureLimit("recipes");
```

### Ingredients.tsx

Adicionar verificacao similar ao salvar novo insumo:

```text
const { getFeatureLimit } = usePlanFeatures();
const ingredientLimit = getFeatureLimit("ingredients");

// Antes de inserir
if (ingredientLimit !== null && currentCount >= ingredientLimit) {
  // Mostrar PlanUpgradePrompt
}
```

### SubRecipes.tsx

Adicionar gate no botao de criar sub-receita:

```text
const { isFeatureEnabled } = usePlanFeatures();
if (!isFeatureEnabled("sub_recipes")) {
  // Mostrar PlanUpgradePrompt
}
```

### CreateStoreModal.tsx / StoreContext.tsx

Verificar limite de lojas antes de criar:

```text
const { getFeatureLimit } = usePlanFeatures();
const storeLimit = getFeatureLimit("multi_store");
if (storeLimit !== null && stores.length >= storeLimit) {
  // Bloquear criacao
}
```

### MyPlan.tsx

Corrigir mapeamento de featureKeys para alinhar com nomes do banco:

```text
{ featureKey: "recipes" }        // era inexistente
{ featureKey: "ingredients" }    // era inexistente  
{ featureKey: "menu_analysis" }  // era "analyze-menu"
{ featureKey: "combos_ai" }      // era "generate-combo"
{ featureKey: "spreadsheet_import" }  // era "spreadsheet-import"
```

---

## Arquivos Alterados

1. **Migration SQL** -- adicionar features faltantes e corrigir existentes
2. `src/pages/Recipes.tsx` -- usar plan_features em vez de hardcoded
3. `src/pages/Ingredients.tsx` -- adicionar limite de insumos
4. `src/pages/SubRecipes.tsx` -- adicionar gate para sub-receitas
5. `src/components/store/CreateStoreModal.tsx` -- adicionar limite de lojas
6. `src/pages/MyPlan.tsx` -- corrigir featureKeys
7. `src/pages/BackupRestore.tsx` -- verificar feature data_export

## Riscos

| Risco | Mitigacao |
|-------|-----------|
| Usuarios Free com mais de 2 receitas perdem acesso | Nao deletar, apenas impedir criar novas |
| Usuarios Free com mais de 35 insumos | Mesmo: impedir novos, manter existentes |
| spreadsheet_import muda de bloqueado para 1 uso | Melhora experiencia do Free (antes era 0) |
