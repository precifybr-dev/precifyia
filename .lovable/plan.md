

## Plano: Busca Sem Sensibilidade a Acentos

### Objetivo
Tornar todas as buscas do sistema insensíveis a acentos, permitindo que o usuário encontre "Açúcar" digitando "acucar", "Macarrão" digitando "macarrao", etc.

---

### O que será feito

**1. Criar função utilitária de normalização**

Adicionar uma função `normalizeText()` no arquivo `src/lib/utils.ts` que remove todos os acentos e diacríticos de uma string:

```text
Exemplo:
"Açúcar" → "acucar"
"Macarrão" → "macarrao"  
"Café" → "cafe"
```

**2. Atualizar todas as buscas do sistema**

Aplicar a normalização em todos os componentes que fazem busca por texto:

| Arquivo | Local |
|---------|-------|
| `IngredientSelector.tsx` | Seletor de insumos nas fichas técnicas |
| `Ingredients.tsx` | Lista de insumos |
| `Beverages.tsx` | Lista de bebidas |
| `Recipes.tsx` | Lista de fichas técnicas |
| `SubRecipes.tsx` | Lista de sub-receitas |

---

### Detalhes Técnicos

A função usará `String.normalize("NFD")` com regex para remover caracteres diacríticos Unicode:

```typescript
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
```

**Antes** (busca exata):
```typescript
ing.name.toLowerCase().includes(searchTerm.toLowerCase())
```

**Depois** (busca sem acentos):
```typescript
normalizeText(ing.name).includes(normalizeText(searchTerm))
```

---

### Arquivos a serem modificados

1. `src/lib/utils.ts` - Adicionar função `normalizeText`
2. `src/components/recipes/IngredientSelector.tsx` - Importar e usar na busca
3. `src/pages/Ingredients.tsx` - Importar e usar na busca
4. `src/pages/Beverages.tsx` - Importar e usar na busca
5. `src/pages/Recipes.tsx` - Importar e usar na busca
6. `src/pages/SubRecipes.tsx` - Importar e usar na busca

