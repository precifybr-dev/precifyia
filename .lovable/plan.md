

## Plano: Melhorias no Simulador de Lucro + Clareza do Dr. Margem

### 1. Puxar taxa iFood cadastrada automaticamente
**`src/components/dashboard/MarginConsultant.tsx`**
- No `useEffect` que busca receitas, também buscar `ifood_real_percentage` do perfil (`profiles`)
- Pré-preencher o campo "Taxa iFood" com esse valor quando o formulário for carregado ou quando selecionar um produto
- O campo continua editável — o usuário pode sobrescrever
- Mostrar hint: "Do seu cadastro: X%" quando o valor vier do perfil

### 2. Seletor de embalagem cadastrada
**`src/components/dashboard/MarginConsultant.tsx`**
- Buscar embalagens ativas via `packagings` (tabela existente, filtrada por `store_id` e `is_active = true`)
- Adicionar um select/dropdown acima do campo "Embalagem" com as embalagens cadastradas
- Ao selecionar uma embalagem, preencher o campo `packagingCost` com o `cost_total` da embalagem
- Manter campo editável para ajuste manual
- Hint: "Da embalagem: NomeEmbalagem" quando selecionada

### 3. Tooltips explicativos para Anúncio e Desconto
**`src/components/dashboard/MarginConsultant.tsx`**
- No campo "Anúncio": adicionar texto explicativo abaixo — "Custo pago em anúncios do iFood ou redes sociais para promover este produto. Ex: Entrega Grátis patrocinada, Ads."
- No campo "Desconto": adicionar texto explicativo — "Valor em R$ de desconto aplicado na venda deste produto. Ex: cupom, promoção do dia."
- Usar `<p className="text-[10px] text-muted-foreground">` para manter visual consistente

### 4. Melhorar mensagem do Dr. Margem para CMV alto
**`src/lib/dr-margem-engine.ts`**
- Alterar a mensagem do tipo `cmv_alto` (CMV > 40%) de genérica para explicativa:
  - **message**: `"O custo dos insumos representa {cmv}% do preço de venda (acima de 40%). Isso significa que sobra pouco para cobrir taxas, embalagem e lucro."`
  - **priceSuggestion**: Adicionar sugestão de preço mínimo para atingir CMV de 35%: `"Para um CMV de 35%, o preço mínimo seria {formatCurrency(cost / 0.35)}."`
- Também melhorar a mensagem no `margin-engine.ts` (alert de CMV >= 40): `"O custo dos insumos já representa {cmv.toFixed(0)}% do preço — acima do ideal de 35%."`

### Arquivos editados
- `src/components/dashboard/MarginConsultant.tsx` — taxa iFood, seletor embalagem, tooltips
- `src/lib/dr-margem-engine.ts` — mensagem CMV alto com contexto numérico
- `src/lib/margin-engine.ts` — alert CMV com percentual real

