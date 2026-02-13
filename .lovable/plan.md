

## Plano: WhatsApp via botao e Central de Ajuda publica

### Resumo

Duas mudancas principais:

1. **WhatsApp**: Remover o numero visivel do Footer e adicionar um botao flutuante de WhatsApp na Landing Page (e opcionalmente no Footer) que abre o chat diretamente via link `https://wa.me/5547996887776`, sem exibir o numero.

2. **Central de Ajuda (Footer)**: O link "Central de Ajuda" no Footer atualmente mostra um toast dizendo "em breve". Vamos criar uma secao de FAQ publica na Landing Page (ou uma pagina separada acessivel sem login) com perguntas voltadas para visitantes que querem entender o que e a plataforma, como funciona, e conceitos como CMV. Diferente da Central de Ajuda interna (que depende do banco de dados e login), esta sera estatica e publica.

---

### Detalhes Tecnicos

#### 1. Botao flutuante de WhatsApp

- Criar componente `WhatsAppButton` com icone do WhatsApp (usando SVG ou emoji) fixo no canto inferior direito da Landing Page.
- Link: `https://wa.me/5547996887776` (abre sem mostrar o numero ao usuario).
- Estilo: botao verde arredondado, posicao `fixed bottom-6 right-6`.
- Renderizado apenas na Landing Page (dentro do componente `Landing.tsx`).

#### 2. Footer - Remover numero visivel

- No `Footer.tsx`, remover o bloco que exibe "WhatsApp: (47) 99688-7776".
- Substituir o link "Central de Ajuda" (que mostra toast placeholder) por um link real.

#### 3. Central de Ajuda publica

- Criar pagina `/ajuda` (publica, sem autenticacao) com FAQs estaticas voltadas para visitantes.
- Conteudo focado em:
  - O que e o Precify e para quem serve
  - Como a plataforma funciona (fluxo basico)
  - O que e CMV e por que importa
  - Diferenca entre preco de balcao e marketplace
  - Preciso saber contabilidade para usar?
  - Funciona para quem nao usa iFood?
  - Como comecar (trial gratuito)
- Rota publica no `App.tsx`.
- Link no Footer apontando para `/ajuda`.

#### Arquivos modificados
- `src/components/landing/Footer.tsx` - remover numero, atualizar link Central de Ajuda
- `src/pages/Landing.tsx` - adicionar botao WhatsApp flutuante
- `src/pages/PublicHelp.tsx` (novo) - pagina publica de FAQ
- `src/App.tsx` - adicionar rota `/ajuda`

