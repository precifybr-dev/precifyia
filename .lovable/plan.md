

## Correção: Adicionar Menu Lateral na Página da Universidade

### Problema
A página `/app/universidade` renderiza sem o menu lateral (sidebar) que existe em todas as outras páginas do app (`/app/business`, `/app/ingredients`, `/app/recipes`, etc.). Isso deixa o usuário sem navegação e sem botão de voltar.

### Causa
Cada página do app possui sua própria sidebar duplicada internamente. A página `University.tsx` foi criada sem replicar esse padrão.

### Solução
Adicionar a sidebar completa na página `University.tsx`, seguindo o mesmo padrão das demais páginas:

**1. Estado e lógica de autenticação**
- Adicionar estados: `sidebarOpen`, `user`, `profile`, `theme`
- Verificar autenticação ao montar (redirecionar para `/login` se não autenticado)
- Buscar perfil do usuário

**2. Sidebar com navegação completa**
- Logo clicável
- Menu com os mesmos itens das outras páginas (Dashboard, Área do Negócio, Insumos, Bebidas, Fichas Técnicas, Combos, Universidade como ativo, Suporte)
- Toggle de tema (claro/escuro)
- Informações do usuário (avatar, nome, email)
- Botão de logout
- Overlay mobile para fechar a sidebar

**3. Header mobile**
- Botão hamburger (Menu) para abrir a sidebar em telas pequenas
- Título "Universidade" visível no topo

**4. Layout**
- Conteúdo principal com `lg:ml-64` para respeitar a largura da sidebar
- Sidebar fixa com `w-64` e responsiva (escondida em mobile, visível em desktop)

### Arquivo modificado
- `src/pages/University.tsx` -- reescrever para incluir a sidebar completa, mantendo toda a lógica existente de módulos, aulas e progresso
