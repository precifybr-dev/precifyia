

# Plano Atualizado: Pesquisa, Filtros e Cor em Todas as Telas

## Resumo
Adicionar funcionalidade de busca e filtros em **4 telas** (Insumos, Bebidas, Fichas Tecnicas e Sub-receitas), campo de categoria para bebidas, e **filtro por cor** em Fichas Tecnicas e Sub-receitas tambem.

---

## O Que Sera Implementado

### 1. Componente Reutilizavel de Busca e Filtros
Criar um componente `SearchAndFilter` que sera usado em todas as 4 telas:
- Campo de busca sutil com icone de lupa
- Botao de filtro que abre um Popover com opcoes
- Design minimalista e discreto

### 2. Funcionalidades por Tela

| Tela | Pesquisa | Ordenacao | Filtro Cor | Filtro Categoria |
|------|----------|-----------|------------|------------------|
| Insumos | Por nome | A-Z, Z-A, Custo | Sim | - |
| Bebidas | Por nome | A-Z, Z-A, Custo, Venda | Sim | Sim (novo campo) |
| Fichas Tecnicas | Por nome | A-Z, Z-A, Custo | **Sim (novo)** | - |
| Sub-receitas | Por nome | A-Z, Z-A, Custo | **Sim (novo)** | - |

### 3. Campo de Categoria para Bebidas
- Novo campo opcional no formulario
- Opcoes: Alcoolica, Refrigerante, Sucos, Agua, Outros
- Filtro dedicado na area de bebidas

---

## Alteracoes Planejadas

### Novo Arquivo: `src/components/ui/SearchAndFilter.tsx`

Componente reutilizavel com:
- Input de busca com debounce para performance
- Popover com opcoes de filtro e ordenacao
- Props flexiveis para adaptar a cada tela

```typescript
interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  selectedColor: string | null;
  onColorChange: (color: string | null) => void;
  // Opcoes especificas por tela
  showCostSort?: boolean;
  showSellingSort?: boolean;
  // Para bebidas
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  showCategoryFilter?: boolean;
}
```

### Migracao do Banco de Dados

```sql
-- Adicionar coluna de categoria na tabela beverages
ALTER TABLE public.beverages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;
```

### Arquivos a Modificar

1. **`src/pages/Beverages.tsx`**
   - Adicionar estados de busca, filtro e ordenacao
   - Adicionar campo de categoria no formulario
   - Integrar componente SearchAndFilter
   - Implementar logica de filtragem com useMemo

2. **`src/pages/Ingredients.tsx`**
   - Adicionar estados de busca, filtro e ordenacao
   - Integrar componente SearchAndFilter
   - Implementar logica de filtragem

3. **`src/pages/Recipes.tsx`**
   - Adicionar estados de busca, filtro e ordenacao
   - **Adicionar filtro por cor (novo)**
   - Integrar componente SearchAndFilter
   - Implementar logica de filtragem

4. **`src/pages/SubRecipes.tsx`**
   - Adicionar estados de busca, filtro e ordenacao
   - **Adicionar filtro por cor (novo)**
   - Integrar componente SearchAndFilter
   - Implementar logica de filtragem

---

## Detalhes Tecnicos

### Logica de Filtragem (exemplo)

```typescript
const filteredItems = useMemo(() => {
  let result = [...items];
  
  // Busca por nome
  if (searchTerm) {
    result = result.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Filtro por cor
  if (selectedColor) {
    result = result.filter(item => item.color === selectedColor);
  }
  
  // Filtro por categoria (apenas bebidas)
  if (selectedCategory) {
    result = result.filter(item => item.category === selectedCategory);
  }
  
  // Ordenacao
  switch (sortOption) {
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      result.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'cost-asc':
      result.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
      break;
    case 'cost-desc':
      result.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0));
      break;
    case 'selling-asc':
      result.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
      break;
    case 'selling-desc':
      result.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
      break;
  }
  
  return result;
}, [items, searchTerm, selectedColor, selectedCategory, sortOption]);
```

### Categorias de Bebidas

```typescript
const beverageCategories = [
  { value: "alcoolica", label: "Alcoolica" },
  { value: "refrigerante", label: "Refrigerante" },
  { value: "sucos", label: "Sucos" },
  { value: "agua", label: "Agua" },
  { value: "outros", label: "Outros" },
];
```

### Cores Disponiveis para Filtro

Usar as cores ja definidas em `color-picker.tsx`:
- Laranja, Amarelo, Verde, Ciano, Azul, Roxo, Rosa, Cinza
- Vermelho (reservado para sub-receitas)

---

## Design da Interface

### Barra de Busca e Filtros (posicao no header)

```text
+--------------------------------------------------------------+
| [Lupa] Buscar...                    [Filtro] | [+ Novo Item] |
+--------------------------------------------------------------+
```

### Popover de Filtros

```text
+---------------------------+
|  Ordenar por              |
|  [A-Z] [Z-A]              |
|                           |
|  Por Custo                |
|  [Menor->Maior]           |
|  [Maior->Menor]           |
|                           |
|  Filtrar por Cor          |
|  [o] [o] [o] [o] [o] [o]  |
|                           |
|  [Limpar Filtros]         |
+---------------------------+
```

Para bebidas, adiciona:
```text
|  Categoria                |
|  [Select: Todas, Alcool...] |
```

---

## Comportamento Esperado

1. **Preenchimento Opcional**: Nenhum filtro ou categoria e obrigatorio
2. **Combinacao de Filtros**: Usuario pode combinar busca + cor + ordenacao
3. **Sem Persistencia**: Filtros resetam ao sair da pagina
4. **Performance**: Filtragem em memoria (client-side) para resposta instantanea
5. **Feedback Visual**: Badge indicando quantidade de filtros ativos
6. **Responsivo**: Funciona bem em mobile e desktop

