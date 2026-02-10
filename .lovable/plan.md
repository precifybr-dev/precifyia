
# Plano de Correções: Menus Admin, Navegação e Autenticação

## Problemas Identificados

### 1. Menus do Admin que nao abrem ao clicar
**Causa raiz**: Os itens do menu lateral (Usuarios, Financeiro, Suporte, Metricas, Logs) usam `section` para trocar abas dentro do `AdminDashboard`. Porem, quando o usuario esta em `/admin/collaborators` ou `/admin/system-book`, clicar nesses itens nao faz nada porque o `onSectionChange` so funciona dentro da pagina AdminDashboard.

**Solucao**: Alterar o `handleNavClick` no `AdminLayout.tsx` para que, ao clicar num item com `section`, primeiro navegue para `/admin` e passe a section como parametro (via state ou query param). O `AdminDashboard` deve ler esse parametro e ativar a aba correta.

### 2. Botao "Voltar" na Ficha Tecnica vai para Dashboard
**Causa raiz**: Na pagina `Recipes.tsx` (linha 953), o botao "Voltar" sempre faz `navigate("/app")`. Quando o usuario esta editando uma ficha tecnica (formulario aberto), deveria voltar para a lista de fichas tecnicas, nao para o Dashboard.

**Solucao**: Alterar o botao "Voltar" para verificar se `showForm` esta ativo. Se estiver, chamar `resetForm()` (que fecha o formulario e volta para a lista). Caso contrario, manter `navigate("/app")`.

### 3. Permissao do Master para acessar conta de usuarios (Suporte)
**Causa raiz**: O sistema de impersonacao ja existe e funciona via `useImpersonation`. O `UserManagement` ja tem a funcionalidade de acessar conta de usuarios. O fluxo parece estar implementado, mas precisa ser verificado se o botao de impersonacao esta corretamente conectado e visivel para o Master.

**Solucao**: Verificar e garantir que o botao de impersonacao no `UserManagement` esteja funcional e acessivel ao Master. Revisar se ha alguma condicao bloqueando o acesso.

### 4. Remover codigo visivel no site ao acessar como Master
**Causa raiz**: Provavelmente se refere a elementos de debug, banners ou marcacoes visuais que aparecem quando o Master acessa a area do usuario. Sera necessario verificar se ha algum componente renderizando informacao tecnica indesejada.

**Solucao**: Revisar os componentes renderizados na area do usuario e remover qualquer elemento de debug ou codigo exposto.

### 5. Autenticacao Google
**Status**: Ja esta implementado usando `lovable.auth.signInWithOAuth("google")` que e o provedor gerenciado gratuito do Lovable Cloud. Nenhuma alteracao necessaria.

---

## Detalhes Tecnicos

### Arquivo 1: `src/components/admin/AdminLayout.tsx`
- Modificar `handleNavClick`: quando o item tem `section` e a rota atual nao e `/admin`, navegar para `/admin` com `state: { section: item.section }`
- Isso garante que clicar em qualquer menu sempre funciona, independente da pagina atual

```text
handleNavClick(item) {
  if (item.path) {
    navigate(item.path);
  } else if (item.section) {
    if (location.pathname !== "/admin") {
      navigate("/admin", { state: { section: item.section } });
    } else if (onSectionChange) {
      onSectionChange(item.section);
    }
  }
}
```

### Arquivo 2: `src/pages/AdminDashboard.tsx`
- Ler `location.state?.section` no `useEffect` e chamar `setActiveTab` com o valor recebido
- Limpar o state apos aplicar para evitar reativacao em navegacoes futuras

### Arquivo 3: `src/pages/Recipes.tsx`
- Alterar o botao "Voltar" (linha 953) para verificar `showForm`:
  - Se `showForm === true`: chamar `resetForm()` para voltar a lista
  - Se `showForm === false`: manter `navigate("/app")`
- Alterar o texto do botao para refletir o destino: "Voltar para lista" vs "Voltar"

### Arquivo 4: Verificacao do `UserManagement.tsx`
- Confirmar que o fluxo de impersonacao esta conectado e funcional
- Garantir que o botao "Acessar conta" esta visivel para o Master

### Arquivo 5: Revisao de elementos visuais indesejados
- Verificar se ha algum componente de debug sendo renderizado na area do usuario quando acessado pelo Master
