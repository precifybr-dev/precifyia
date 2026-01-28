
# Implementacao da Nova Logo Oficial PRECIFY

## Resumo

Substituir o logo placeholder atual (quadrado azul com "P") pela nova logo oficial 3D do PRECIFY em todos os locais do sistema, criando um componente reutilizavel.

---

## Contexto Atual

O projeto usa um logo improvisado em **11 arquivos diferentes**:

```text
Header.tsx, Footer.tsx, Login.tsx, Register.tsx, Dashboard.tsx,
Onboarding.tsx, BusinessArea.tsx, Ingredients.tsx, Beverages.tsx,
Recipes.tsx, SubRecipes.tsx
```

Cada um repete o mesmo codigo:
```tsx
<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
  <span className="font-logo text-primary-foreground text-sm">P</span>
</div>
<span className="font-logo text-xl text-foreground">PRECIFY</span>
```

---

## Solucao Proposta

### 1. Adicionar a Imagem da Logo ao Projeto

Copiar a imagem enviada para `src/assets/logo-precify.png` para uso como modulo ES6 com otimizacao de bundling.

### 2. Criar Componente Logo Reutilizavel

Novo arquivo: `src/components/ui/Logo.tsx`

Props suportadas:
- `size`: "sm" | "md" | "lg" | "xl" (para diferentes contextos)
- `showText`: boolean (exibir ou nao o texto "PRECIFY")
- `textClassName`: string (classes customizadas para o texto)

Tamanhos predefinidos:

| Size | Icone | Uso |
|------|-------|-----|
| sm | 32x32px | Header, Sidebar |
| md | 40x40px | Login/Register inline |
| lg | 64x64px | Onboarding |
| xl | 96x96px | Telas decorativas Login/Register |

### 3. Atualizar Arquivos que Usam a Logo

| Arquivo | Contexto | Configuracao |
|---------|----------|--------------|
| Header.tsx | Navegacao principal | size="sm", showText=true |
| Footer.tsx | Rodape | size="sm", showText=true |
| Login.tsx | Formulario + painel decorativo | size="md" + size="xl" |
| Register.tsx | Formulario + painel decorativo | size="md" + size="xl" |
| Dashboard.tsx | Sidebar | size="sm", showText=true |
| Onboarding.tsx | Topo do formulario | size="lg", showText=true |
| BusinessArea.tsx | Sidebar | size="sm", showText=true |
| Ingredients.tsx | Sidebar | size="sm", showText=true |
| Beverages.tsx | Sidebar | size="sm", showText=true |
| Recipes.tsx | Sidebar | size="sm", showText=true |
| SubRecipes.tsx | Sidebar | size="sm", showText=true |

### 4. Atualizar Favicon e Meta Tags (Bonus)

- Atualizar `public/favicon.ico` com versao otimizada do icone
- Atualizar OG images em `index.html` para usar a marca correta

---

## Estrutura do Componente

```text
src/components/ui/Logo.tsx
          |
          v
    [Props: size, showText, textClassName, className]
          |
          v
    <img src={logoImage} /> + <span>PRECIFY</span>
```

---

## Detalhes Tecnicos

### Componente Logo.tsx

```tsx
import logoImage from "@/assets/logo-precify.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function Logo({ 
  size = "sm", 
  showText = true, 
  className = "",
  textClassName = ""
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="PRECIFY" 
        className={`${sizeMap[size]} object-contain`}
      />
      {showText && (
        <span className={`font-logo text-xl text-foreground ${textClassName}`}>
          PRECIFY
        </span>
      )}
    </div>
  );
}
```

### Exemplo de Uso

```tsx
// Header
<Logo size="sm" showText />

// Login decorativo (apenas icone grande)
<Logo size="xl" showText={false} />

// Onboarding
<Logo size="lg" showText />
```

---

## Arquivos a Criar

1. `src/assets/logo-precify.png` (copia da imagem enviada)
2. `src/components/ui/Logo.tsx` (componente reutilizavel)

## Arquivos a Modificar

1. `src/components/landing/Header.tsx`
2. `src/components/landing/Footer.tsx`
3. `src/pages/Login.tsx`
4. `src/pages/Register.tsx`
5. `src/pages/Dashboard.tsx`
6. `src/pages/Onboarding.tsx`
7. `src/pages/BusinessArea.tsx`
8. `src/pages/Ingredients.tsx`
9. `src/pages/Beverages.tsx`
10. `src/pages/Recipes.tsx`
11. `src/pages/SubRecipes.tsx`

---

## Beneficios

- **Consistencia**: Logo unica em todo o sistema
- **Manutencao**: Alterar em um unico componente atualiza tudo
- **Profissionalismo**: Logo 3D moderna substitui placeholder basico
- **Performance**: Imagem otimizada via bundler (src/assets)
