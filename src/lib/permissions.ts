import { AppPermission, AppRole } from "@/hooks/useRBAC";

// Mapeamento de permissões para labels em português
export const permissionLabels: Record<AppPermission, string> = {
  view_users: "Visualizar usuários",
  edit_users: "Editar usuários",
  impersonate_user: "Modo suporte (impersonar)",
  reset_password: "Resetar senhas",
  view_financials: "Visualizar financeiro",
  view_metrics: "Visualizar métricas",
  manage_plans: "Gerenciar planos",
  respond_support: "Responder suporte",
  manage_collaborators: "Gerenciar colaboradores",
  view_logs: "Visualizar logs",
};

// Mapeamento de roles para labels em português
export const roleLabels: Record<AppRole, string> = {
  user: "Usuário",
  admin: "Administrador",
  master: "Master",
  suporte: "Suporte",
  financeiro: "Financeiro",
  analista: "Analista",
};

// Cores para cada role
export const roleColors: Record<AppRole, string> = {
  user: "bg-slate-100 text-slate-800",
  admin: "bg-blue-100 text-blue-800",
  master: "bg-purple-100 text-purple-800",
  suporte: "bg-green-100 text-green-800",
  financeiro: "bg-amber-100 text-amber-800",
  analista: "bg-cyan-100 text-cyan-800",
};

// Permissões padrão por role
export const defaultRolePermissions: Record<AppRole, AppPermission[]> = {
  user: [],
  admin: [
    "view_users",
    "edit_users",
    "view_metrics",
    "view_logs",
  ],
  master: [
    "view_users",
    "edit_users",
    "impersonate_user",
    "reset_password",
    "view_financials",
    "view_metrics",
    "manage_plans",
    "respond_support",
    "manage_collaborators",
    "view_logs",
  ],
  suporte: [
    "view_users",
    "impersonate_user",
    "reset_password",
    "respond_support",
    "view_logs",
  ],
  financeiro: [
    "view_users",
    "view_financials",
    "view_metrics",
    "manage_plans",
  ],
  analista: [
    "view_users",
    "view_metrics",
    "view_logs",
  ],
};

// Lista de todas as permissões
export const allPermissions: AppPermission[] = [
  "view_users",
  "edit_users",
  "impersonate_user",
  "reset_password",
  "view_financials",
  "view_metrics",
  "manage_plans",
  "respond_support",
  "manage_collaborators",
  "view_logs",
];

// Lista de roles que podem ser atribuídas (exceto master)
export const assignableRoles: AppRole[] = [
  "suporte",
  "financeiro",
  "analista",
];

// Agrupar permissões por categoria
export const permissionCategories = {
  usuarios: {
    label: "Usuários",
    permissions: ["view_users", "edit_users", "impersonate_user", "reset_password"] as AppPermission[],
  },
  financeiro: {
    label: "Financeiro",
    permissions: ["view_financials", "view_metrics", "manage_plans"] as AppPermission[],
  },
  suporte: {
    label: "Suporte",
    permissions: ["respond_support"] as AppPermission[],
  },
  sistema: {
    label: "Sistema",
    permissions: ["manage_collaborators", "view_logs"] as AppPermission[],
  },
};
