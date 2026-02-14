

## Melhorar Design da Seção "Planilha vs Precify"

### Mudancas planejadas no `ComparisonSection.tsx`:

1. **Icone de Planilha Excel com X vermelho**
   - Adicionar um icone SVG inline representando uma planilha (grid com celulas) com um X vermelho sobreposto no header da coluna "Planilha"
   - Usar icones do Lucide (`FileSpreadsheet` + `X`) compostos para criar o efeito

2. **Icone do Precify na coluna direita**
   - Adicionar icone de escudo/check (`ShieldCheck`) em verde no header da coluna "Precify"

3. **Animacoes suaves**
   - Cada linha da tabela entra com `animate-fade-in` escalonado (delay incremental por linha)
   - Hover nas linhas com leve scale (`hover:scale-[1.01]`) e sombra
   - Icones de Check pulsam sutilmente ao aparecer
   - Botao CTA com leve animacao de flutuacao (`animate-float`)

4. **Melhorias visuais**
   - Coluna "Planilha" com fundo levemente avermelhado (`bg-destructive/5`)
   - Coluna "Precify" com fundo levemente esverdeado (`bg-success/5`)
   - Headers das colunas maiores e com icones
   - Borda esquerda colorida nas linhas (vermelho para planilha, verde para precify como accent)
   - Separador visual mais claro entre as colunas

### Arquivo modificado:
- `src/components/landing/ComparisonSection.tsx`

### Detalhes tecnicos:
- Usar `FileSpreadsheet` do lucide-react para icone de planilha
- Aplicar `style={{ animationDelay }}` para escalonamento das animacoes fade-in
- Classes Tailwind existentes no projeto (`animate-fade-in`, `animate-float`, `hover:shadow-card-hover`)
- Nenhuma dependencia nova necessaria

