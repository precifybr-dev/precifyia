

## Plan: Capitalizar Primeira Letra dos Nomes das Lojas

### Problema
Os nomes das lojas aparecem exatamente como foram digitados pelo usuário, sem padronização. Ex: "xis tudo" em vez de "Xis Tudo".

### Solução
Criar uma função utilitária `capitalizeWords` em `src/lib/utils.ts` que capitaliza a primeira letra de cada palavra e aplicá-la em todos os pontos onde `store.name` é exibido.

### Alterações

**1. `src/lib/utils.ts`** — Adicionar função:
```typescript
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}
```

**2. Aplicar `capitalizeWords(store.name)` nos seguintes arquivos:**

- `src/components/store/StoreSwitcher.tsx` — linhas 64 e 93
- `src/components/plan/PlanOverviewTab.tsx` — linhas 363, 370, 390
- `src/components/recipes/CopyRecipesFromStoreModal.tsx` — linhas 463, 488
- `src/components/dashboard/OnboardingProgress.tsx` — linha 87
- `src/pages/BusinessArea.tsx` — linha 323
- `src/pages/University.tsx` — linha 372
- `src/components/layout/AppSidebar.tsx` (se exibir nome da loja)

### Detalhes técnicos
- Apenas visual — não altera o valor salvo no banco
- Função simples, sem dependências externas
- Padrão: "xis tudo" → "Xis Tudo", "PIZZA" → "PIZZA" (mantém maiúsculas existentes)

