
# Ajuste Fino da Proposta de Valor - Linha de Qualificacao de Publico

## Objetivo

Adicionar uma linha curta de qualificacao de publico logo abaixo da headline existente, sem alterar nenhum texto atual. Isso deixara claro que o sistema atende diferentes tipos de negocios de alimentacao e nao apenas quem vende no iFood.

## Estrutura Atual (linhas 25-34)

```text
[Badge de alerta]
     ↓
[Headline] "Saiba exatamente quanto lucra em cada venda."
     ↓
[Subheadline] "Calcule o preco certo dos seus produtos..."
```

## Estrutura Proposta

```text
[Badge de alerta]
     ↓
[Headline] "Saiba exatamente quanto lucra em cada venda."
     ↓
[NOVA LINHA] "Para restaurantes, lanchonetes, marmitarias e quem vende no balcao ou delivery"
     ↓
[Subheadline] "Calcule o preco certo dos seus produtos..."
```

---

## Alteracao Tecnica

**Arquivo:** `src/components/landing/HeroSection.tsx`

**Posicao:** Entre a linha 29 (fim do h1) e linha 31 (inicio da subheadline)

**Codigo a adicionar:**

```tsx
{/* Audience qualifier */}
<p className="text-sm sm:text-base text-muted-foreground/80 mb-4">
  Para restaurantes, lanchonetes, marmitarias e quem vende no balcao ou delivery
</p>
```

---

## Detalhes de Estilo

| Propriedade | Valor | Justificativa |
|-------------|-------|---------------|
| Tamanho | `text-sm sm:text-base` | Menor que a subheadline para hierarquia visual |
| Cor | `text-muted-foreground/80` | Sutil, nao compete com headline |
| Espacamento | `mb-4` | Separacao adequada antes da subheadline |

---

## Resultado Visual

A linha funcionara como um "qualificador" que:
1. Expande o publico-alvo alem do iFood
2. Menciona os dois canais de venda (balcao e delivery)
3. Lista tipos de negocios que se identificarao imediatamente

---

## Arquivos a Modificar

1. `src/components/landing/HeroSection.tsx`
   - Adicionar paragrafo de qualificacao entre a headline e a subheadline (apos linha 29)
