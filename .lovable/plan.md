

## Plano: Remover gap entre menu e conteúdo

### Diagnóstico

O `AppShell` já renderiza a sidebar (`w-56` = 224px) e aplica `lg:ml-56` no `<main>`. Porém, 7 páginas que **não foram refatoradas** ainda renderizam sua **própria** `AppSidebar` e aplicam `lg:ml-64` (256px) internamente. Isso cria:
- Sidebar duplicada (a do Shell fica por trás)
- Gap de 256px dentro de uma área que já tem 224px de margem = espaço vazio visível

### Páginas afetadas

| Página | Problema |
|--------|----------|
| `Dashboard.tsx` | AppSidebar própria + `lg:ml-64` |
| `Recipes.tsx` | AppSidebar própria + `lg:ml-64` |
| `Ingredients.tsx` | AppSidebar própria + `lg:ml-64` |
| `BusinessArea.tsx` | AppSidebar própria + `lg:ml-64` |
| `SubRecipes.tsx` | AppSidebar própria + `lg:ml-64` |
| `Beverages.tsx` | AppSidebar própria + `lg:ml-64` |
| `University.tsx` | Sidebar própria + `lg:ml-64` |
| `Packagings.tsx` | Usa `AppLayout` (que também renderiza sidebar) |

### Correção para cada página

Para cada uma das 8 páginas:
1. **Remover** import e uso de `AppSidebar` / `AppLayout`
2. **Remover** estado local de `sidebarOpen`, `user`, `profile`, `isLoading` e `checkAuth`
3. **Remover** wrapper `<div className="min-h-screen bg-background flex">` e `<main className="flex-1 lg:ml-64">`
4. **Usar** `useShell()` do AppShell para obter `user`, `profile` e `openSidebar`
5. **Usar** `PageHeader` do AppShell para o header (ou header customizado com `openSidebar`)
6. Manter apenas o conteúdo interno da página (sem layout wrapper)

### Resultado
- Sidebar renderizada **uma única vez** pelo AppShell
- Sem gap entre menu e conteúdo
- Páginas mais leves, sem lógica de auth duplicada

### Arquivos editados
- `src/pages/Dashboard.tsx`
- `src/pages/Recipes.tsx`
- `src/pages/Ingredients.tsx`
- `src/pages/BusinessArea.tsx`
- `src/pages/SubRecipes.tsx`
- `src/pages/Beverages.tsx`
- `src/pages/University.tsx`
- `src/pages/Packagings.tsx`

