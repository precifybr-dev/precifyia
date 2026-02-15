

## Secao "Tudo em um so lugar" - Comparacao Visual com Toggle

### O que sera feito

Implementar a `SolutionSection` (que hoje retorna `null`) com um toggle interativo "Sem o Precify" / "Com o Precify", inspirado no layout do Asaas. O titulo sera: **"Aqui sua empresa tem tudo que precisa em um so lugar"**.

### Como funciona

- **Aba "Sem o Precify"**: Mostra um fluxo complexo com varios blocos conectados por setas, representando tudo que o dono de restaurante precisa fazer manualmente usando Excel (calcular custos, controlar taxas, fazer DRE, ajustar precos, conferir margem, etc.)
- **Aba "Com o Precify"**: Mostra os mesmos blocos simplificados, todos conectados a um unico bloco central "Precify", demonstrando que tudo converge para um so lugar

### Conteudo dos blocos (adaptado para restaurantes)

Os blocos representam as dores reais do publico-alvo:

1. Calcular custo dos pratos (icone Calculator)
2. Controlar taxas do iFood (icone Receipt)
3. Montar precificacao (icone DollarSign)
4. Fazer DRE simplificado (icone FileBarChart)
5. Conferir margem de lucro (icone TrendingUp)
6. Gerenciar multi-loja (icone Store)

**Sem o Precify**: Cada bloco gera sub-blocos extras (planilhas, formulas manuais, erros, retrabalho) dispostos em 3 linhas com setas mostrando complexidade.

**Com o Precify**: Os mesmos 4 blocos principais conectam-se diretamente ao bloco central Precify, limpo e organizado.

### Layout responsivo

- **Desktop**: Grid 3-4 colunas com setas horizontais entre blocos
- **Mobile**: Blocos empilhados verticalmente com setas para baixo, scroll suave
- Toggle centralizado no topo da secao

### Implementacao

1. **Reescrever `SolutionSection.tsx`** com:
   - Estado `activeTab` ("sem" | "com") controlando o toggle
   - Toggle estilizado com bg-primary para aba ativa
   - Renderizacao condicional dos dois layouts
   - Animacao fade na troca de aba
   - Cards com borda azul (Precify) e borda laranja/vermelha (problemas) no modo "sem"

2. **Adicionar `<SolutionSection />` no `Landing.tsx`** entre ComparisonSection e DemoSection

3. **CTA** no final: botao "Teste gratis por 7 dias"

### Detalhes visuais

- Fundo: `bg-muted/30` (cinza claro)
- Cards: `bg-card` com borda `border-primary/30` (azul) para itens do usuario, `border-border` para intermediarios
- Card problema (sem Precify): `border-destructive/30` com icone laranja/vermelho
- Card Precify central (com Precify): `bg-primary text-primary-foreground` grande e destacado
- Setas: SVG simples ou caracteres `→` / `↓` em `text-muted-foreground`
- Mobile: Cards em coluna unica, setas verticais `↓`

### Arquivos modificados
- **Reescrito**: `src/components/landing/SolutionSection.tsx`
- **Modificado**: `src/pages/Landing.tsx` (adicionar na ordem correta)
