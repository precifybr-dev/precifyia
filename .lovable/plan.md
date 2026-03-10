

## Plano: Shimmer/Wave animation no Skeleton

O componente `Skeleton` atual usa `animate-pulse` (opacidade pulsante). O efeito desejado — como o do iFood — é um **shimmer**: um gradiente que desliza horizontalmente sobre o bloco, criando uma "onda de luz".

### Alteração

**`src/components/ui/skeleton.tsx`** — trocar `animate-pulse bg-muted` por uma classe com gradiente animado via CSS.

**`src/index.css`** — adicionar o keyframe `shimmer`:

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

O componente Skeleton usará:
```tsx
<div className={cn(
  "rounded-md bg-gradient-to-r from-muted via-muted/40 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
  className
)} />
```

Isso aplica automaticamente o efeito shimmer em todos os lugares que já usam `<Skeleton />` (IfoodMenuView, Sidebar, etc.), sem precisar alterar nenhum outro arquivo.

### Arquivos editados
- `src/components/ui/skeleton.tsx`
- `src/index.css`

