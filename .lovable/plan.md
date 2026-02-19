

## Correções Seguras (4 itens)

### 1. Corrigir limites do plano gratuito em Register.tsx
- Alterar "Até 35 insumos" para "Até 80 insumos"
- Alterar "Até 3 fichas técnicas" para "Até 10 fichas técnicas"
- Esses valores estao incorretos e nao refletem os limites reais do banco de dados

### 2. Corrigir links quebrados em Register.tsx
- Substituir `href="#"` do link "Termos de Uso" por `/termos-de-uso`
- Substituir `href="#"` do link "Política de Privacidade" por `/politica-de-privacidade`
- Atualmente os links nao levam a lugar nenhum

### 3. Deletar arquivo orfao: src/pages/Index.tsx
- Arquivo padrao do Lovable que nunca e usado (nenhuma rota aponta para ele)
- Contem apenas texto placeholder "Welcome to Your Blank App"

### 4. Deletar arquivo orfao: src/hooks/useIfoodFees.ts
- Hook que nao e importado por nenhum componente do projeto
- Codigo morto sem utilidade

### Detalhes tecnicos

**Register.tsx** - Duas alteracoes de texto e dois hrefs:
- Linha com "35 insumos" vira "80 insumos"
- Linha com "3 fichas" vira "10 fichas"
- `href="#"` nos links de termos e privacidade serao corrigidos para as rotas reais ja existentes no app

**Index.tsx e useIfoodFees.ts** - Exclusao simples, sem impacto (confirmado que nenhum arquivo importa esses modulos)

