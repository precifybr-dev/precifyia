
# Plano: Corrigir Navegação do Menu Lateral Admin

## Problema Diagnosticado
O menu lateral (sidebar) do painel administrativo não funciona porque:
1. Todos os itens de menu apontam para a mesma rota `/admin`
2. O `AdminDashboard` usa um sistema de Tabs interno separado
3. Não há sincronização entre o clique no sidebar e a mudança de aba interna

## Solução Proposta
Sincronizar o sidebar com o sistema de Tabs interno, passando o controle de navegação via props/callbacks.

---

## Etapa 1: Refatorar AdminLayout para controlar navegação interna

### Mudanças em `AdminLayout.tsx`:
- Adicionar prop `activeSection` para receber a seção ativa
- Adicionar prop `onSectionChange` para notificar mudanças de seção
- Remover navegação via `navigate()` e usar callback interno
- Atualizar lógica de `isActive` para usar a seção atual

```text
Interface atualizada:
┌─────────────────────────────────────────────────────────┐
│  AdminLayout                                             │
│  ├── activeSection: string                              │
│  ├── onSectionChange: (section: string) => void         │
│  └── children: ReactNode                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Etapa 2: Atualizar AdminDashboard para gerenciar estado

### Mudanças em `AdminDashboard.tsx`:
- Passar `activeTab` e `setActiveTab` para o `AdminLayout`
- Remover TabsList duplicada (ou mantê-la como navegação secundária)
- Garantir que clicar no sidebar mude a tab correta

```text
Fluxo de navegação:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Sidebar Click   │ ──▶ │  onSectionChange │ ──▶ │  setActiveTab    │
│  (Usuários)      │     │  ("management")  │     │  ("management")  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Etapa 3: Mapear IDs do Sidebar para Tabs

### Mapeamento:
| Sidebar ID     | Tab Value     |
|----------------|---------------|
| overview       | overview      |
| users          | management    |
| collaborators  | (rota separada) |
| financial      | financial     |
| support        | support       |
| metrics        | usage         |
| logs           | logs          |

---

## Etapa 4: Tratar rota separada de Colaboradores

A página de Colaboradores (`/admin/collaborators`) é uma rota separada e deve:
- Continuar navegando via `navigate()` 
- Manter o item destacado no sidebar quando estiver nessa rota

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/AdminLayout.tsx` | Adicionar props de controle e refatorar navegação |
| `src/pages/AdminDashboard.tsx` | Passar estado de tab para o layout |

---

## Seção Técnica

### AdminLayout.tsx - Mudanças Principais:
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
  unreadAlerts?: number;
  activeSection?: string;  // NOVO
  onSectionChange?: (section: string) => void;  // NOVO
}

// No navItems, mapear para seção interna:
const navItems: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, section: "overview" },
  { id: "users", label: "Usuários", icon: Users, section: "management", permission: "view_users" },
  { id: "collaborators", label: "Colaboradores", icon: UserCog, path: "/admin/collaborators", permission: "manage_collaborators" },
  // ...
];

// No onClick do botão:
onClick={() => {
  if (item.path) {
    navigate(item.path);  // Rota separada
  } else if (item.section && onSectionChange) {
    onSectionChange(item.section);  // Seção interna
  }
}}
```

### AdminDashboard.tsx - Mudanças Principais:
```typescript
<AdminLayout 
  unreadAlerts={unreadAlerts.length}
  activeSection={activeTab}
  onSectionChange={setActiveTab}
>
  {/* Conteúdo... */}
</AdminLayout>
```

---

## Resultado Esperado
- Clicar em "Usuários" no sidebar → muda para tab "management" (Usuários)
- Clicar em "Financeiro" no sidebar → muda para tab "financial"
- Clicar em "Colaboradores" → navega para `/admin/collaborators`
- Item ativo no sidebar sempre reflete a seção/página atual
