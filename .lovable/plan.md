

## Plano: Menu fixo com shimmer no conteudo durante navegacao

### Problema

Cada pagina renderiza sua propria sidebar e estado de autenticacao independentemente. Quando o React Suspense carrega uma nova pagina (lazy load), o fallback substitui **tudo** — incluindo a sidebar — causando um flash. Nao ha continuidade visual.

### Solucao

Criar um **shell compartilhado** (`AppShell`) que fica montado permanentemente para todas as rotas `/app/*`. A sidebar e o header ficam fixos, e apenas a area de conteudo troca com um fallback de shimmer.

```text
┌──────────────────────────────────────────────┐
│  AppShell (monta uma vez, nunca desmonta)     │
│ ┌────────┬──────────────────────────────────┐ │
│ │        │  Header (sticky)                 │ │
│ │Sidebar │─────────────────────────────────── │
│ │ (fixo) │  <Suspense fallback={Shimmer}>   │ │
│ │        │    <Outlet /> ← pagina atual     │ │
│ │        │  </Suspense>                     │ │
│ └────────┴──────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Alteracoes

#### 1. Criar `src/components/layout/AppShell.tsx`
- Move a logica de auth, sidebar e header que hoje esta duplicada em cada pagina
- Usa `<Outlet />` do React Router para renderizar a rota filha
- Envolve o Outlet em `<Suspense fallback={<PageSkeleton />}>`
- A sidebar permanece montada enquanto apenas o conteudo muda

#### 2. Criar `src/components/layout/PageSkeleton.tsx`
- Componente com shimmer skeletons simulando um layout generico de pagina
- Blocos de Skeleton para titulo, cards, tabela — visual similar ao screenshot do iFood

#### 3. Alterar `src/App.tsx`
- Substituir as rotas individuais `/app/*` por uma rota pai com `AppShell` como layout:
```tsx
<Route path="/app" element={<AppRoute><AppShell /></AppRoute>}>
  <Route index element={<Dashboard />} />
  <Route path="ingredients" element={<Ingredients />} />
  ...
</Route>
```
- O Suspense com `PageLoader` generico fica apenas para rotas fora do `/app`

#### 4. Refatorar as 8 paginas que usam `AppSidebar` diretamente
Paginas: Dashboard, Ingredients, Recipes, Beverages, BusinessArea, CMVGlobal, SubRecipes, DrMargemReports

Para cada uma:
- Remover import do `AppSidebar`
- Remover estado `sidebarOpen`, `user`, `profile`, `isLoading` e `checkAuth`
- Remover o wrapper `<div className="min-h-screen bg-background flex">` + `<AppSidebar ...>`
- Manter apenas o conteudo dentro do `<main>`, sem o `lg:ml-64`

#### 5. Refatorar as 6 paginas que usam `AppLayout`
Paginas: MyPlan, MenuMirror, Combos, UserSupport, RecycleBin, Packagings

- Remover o wrapper `<AppLayout>` — o shell ja fornece sidebar + header
- Manter apenas o conteudo interno

### Resultado
- Sidebar **nunca desmonta** ao navegar entre paginas
- Ao clicar em um item do menu, a area de conteudo mostra shimmer skeletons ate a pagina carregar
- Paginas ficam mais leves (sem duplicar auth/sidebar/layout)
- Experiencia identica ao Portal do iFood

### Arquivos editados
- `src/components/layout/AppShell.tsx` (novo)
- `src/components/layout/PageSkeleton.tsx` (novo)
- `src/App.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Ingredients.tsx`
- `src/pages/Recipes.tsx`
- `src/pages/Beverages.tsx`
- `src/pages/BusinessArea.tsx`
- `src/pages/CMVGlobal.tsx`
- `src/pages/SubRecipes.tsx`
- `src/pages/DrMargemReports.tsx`
- `src/pages/MyPlan.tsx`
- `src/pages/MenuMirror.tsx`
- `src/pages/Combos.tsx`
- `src/pages/UserSupport.tsx`
- `src/pages/RecycleBin.tsx`
- `src/pages/Packagings.tsx`

