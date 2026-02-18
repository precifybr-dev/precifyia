
# Correcao XSS: Substituir regex por DOMPurify

## Resumo
Substituir a funcao `sanitizeHtml` baseada em regex por **DOMPurify**, biblioteca padrao da industria para sanitizacao segura de HTML.

## Mudancas

### 1. Instalar dependencia
- `dompurify` (runtime)
- `@types/dompurify` (tipos TypeScript)

### 2. Editar `src/pages/University.tsx`

**Adicionar import** (apos linha 26):
```typescript
import DOMPurify from "dompurify";
```

**Remover** a funcao `sanitizeHtml` (linhas 31-36):
```typescript
// REMOVER INTEIRO
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}
```

**Atualizar** linha 192:
```typescript
// Antes
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedLesson.content) }} />

// Depois
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedLesson.content) }} />
```

### Nota sobre `chart.tsx`
O `dangerouslySetInnerHTML` em `chart.tsx` usa dados internos gerados pelo codigo (cores de tema CSS), sem input de usuario. Nao precisa de mudanca.

## Resultado
- Zero mudanca visual
- Protecao completa contra XSS (scripts, event handlers, protocolos javascript, tags SVG maliciosas, codificacao HTML)
