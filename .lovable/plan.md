
# Plano: Corrigir Funcionalidade do Modo Suporte (Impersonação)

## Problema Identificado

O botão "Modo Suporte" exibe o toast "Modo Suporte Ativado" mas não redireciona para a área do usuário nem mostra indicação visual do modo ativo.

**Causa raiz:** O componente `UserManagement` é renderizado sem o callback `onImpersonate`, então após a chamada bem-sucedida à edge function, nenhuma ação adicional acontece.

## Solução

Implementar o fluxo completo de impersonação que:
1. Redirecione o admin para a área do usuário
2. Mostre um banner indicando que está em modo suporte
3. Permita sair do modo suporte e voltar ao painel admin

---

## Etapa 1: Criar Componente de Banner do Modo Suporte

Criar um componente que exibe um banner fixo no topo quando o admin está impersonando um usuário.

**Arquivo:** `src/components/admin/ImpersonationBanner.tsx`

```text
- Ler sessionStorage para verificar se há sessão de impersonação ativa
- Exibir banner com informações do usuário sendo visualizado
- Botão "Sair do Modo Suporte" que limpa a sessão e redireciona para /admin
- Estilo visual destacado (cor de alerta) para ficar evidente
```

---

## Etapa 2: Atualizar AdminDashboard com Handler de Impersonação

Passar o callback `onImpersonate` ao `UserManagement` com a lógica de redirecionamento.

**Arquivo:** `src/pages/AdminDashboard.tsx`

**Alterações:**
```text
Linha 391 - Adicionar prop onImpersonate:
  <UserManagement onImpersonate={handleStartImpersonation} />

Adicionar função handleStartImpersonation:
  - Redirecionar para /app (área do usuário)
  - A sessão de impersonação já está em sessionStorage (feito pelo hook)
```

---

## Etapa 3: Adicionar Banner aos Layouts de Usuário

Incluir o banner de impersonação nos layouts de rotas de usuário.

**Arquivo:** `src/pages/Dashboard.tsx` (e outros layouts de usuário)

**Alterações:**
```text
- Importar ImpersonationBanner
- Renderizar no topo do layout
- O banner só aparece quando há sessão de impersonação ativa
```

---

## Etapa 4: Criar Hook para Gerenciar Estado de Impersonação

Centralizar a lógica de verificação e gerenciamento do modo suporte.

**Arquivo:** `src/hooks/useImpersonation.ts`

```text
Funcionalidades:
- isImpersonating: boolean
- impersonatedUser: { id, email } | null
- endImpersonation(): void - limpa sessão e redireciona
- checkImpersonation(): verificar se sessão é válida
```

---

## Etapa 5: Atualizar App.tsx com Verificação Global

Adicionar o banner de impersonação em um nível mais alto para aparecer em todas as rotas de usuário.

**Arquivo:** `src/App.tsx`

**Alterações:**
```text
- Importar ImpersonationBanner
- Adicionar como wrapper ou componente global
```

---

## Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/components/admin/ImpersonationBanner.tsx` | Criar (novo) |
| `src/hooks/useImpersonation.ts` | Criar (novo) |
| `src/pages/AdminDashboard.tsx` | Editar (passar callback) |
| `src/pages/Dashboard.tsx` | Editar (adicionar banner) |
| `src/App.tsx` | Editar (verificação global) |

---

## Detalhes Técnicos

### Fluxo do Modo Suporte:
```text
1. Admin clica em "Modo Suporte" no dropdown de um usuário
2. Edge function valida permissões e retorna dados do usuário
3. Hook salva dados em sessionStorage
4. Callback onImpersonate redireciona para /app
5. Banner de impersonação aparece em todas as páginas
6. Admin pode navegar e ver o que o usuário vê
7. Clique em "Sair do Modo Suporte" limpa sessão e volta para /admin
```

### Estrutura do sessionStorage:
```json
{
  "impersonation": {
    "token": "imp_1234567890_user-uuid",
    "targetUser": { "id": "...", "email": "..." },
    "startedAt": "2026-01-28T..."
  }
}
```

### Considerações de Segurança:
- A impersonação NÃO altera a sessão de autenticação real
- É apenas modo de visualização (leitura)
- Todas as ações são logadas em `admin_audit_logs`
- Usuário master não pode ser impersonado (bloqueio na edge function)
