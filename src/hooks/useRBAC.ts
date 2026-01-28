import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "admin" | "master" | "suporte" | "financeiro" | "analista";

export type AppPermission =
  | "view_users"
  | "edit_users"
  | "impersonate_user"
  | "reset_password"
  | "view_financials"
  | "view_metrics"
  | "manage_plans"
  | "respond_support"
  | "manage_collaborators"
  | "view_logs";

interface Collaborator {
  id: string;
  user_id: string;
  role: AppRole;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface RBACState {
  isCollaborator: boolean;
  role: AppRole | null;
  permissions: AppPermission[];
  isLoading: boolean;
}

export function useRBAC(userId: string | undefined) {
  const [state, setState] = useState<RBACState>({
    isCollaborator: false,
    role: null,
    permissions: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    fetchRBACData(userId);
  }, [userId]);

  const fetchRBACData = async (uid: string) => {
    try {
      // Verificar se é colaborador
      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .maybeSingle();

      if (!collaborator) {
        setState({
          isCollaborator: false,
          role: null,
          permissions: [],
          isLoading: false,
        });
        return;
      }

      // Buscar permissões da role
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select("permission")
        .eq("role", collaborator.role);

      // Buscar permissões específicas do usuário
      const { data: userPermissions } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", uid);

      // Combinar permissões
      const allPermissions = new Set<AppPermission>();
      rolePermissions?.forEach((rp) => allPermissions.add(rp.permission as AppPermission));
      userPermissions?.forEach((up) => allPermissions.add(up.permission as AppPermission));

      setState({
        isCollaborator: true,
        role: collaborator.role as AppRole,
        permissions: Array.from(allPermissions),
        isLoading: false,
      });
    } catch (error) {
      console.error("Erro ao buscar dados RBAC:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const hasPermission = useCallback(
    (permission: AppPermission): boolean => {
      return state.permissions.includes(permission);
    },
    [state.permissions]
  );

  const hasAnyPermission = useCallback(
    (permissions: AppPermission[]): boolean => {
      return permissions.some((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  const hasAllPermissions = useCallback(
    (permissions: AppPermission[]): boolean => {
      return permissions.every((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  const isMaster = useCallback((): boolean => {
    return state.role === "master";
  }, [state.role]);

  const refetch = useCallback(() => {
    if (userId) {
      setState((prev) => ({ ...prev, isLoading: true }));
      fetchRBACData(userId);
    }
  }, [userId]);

  return {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isMaster,
    refetch,
  };
}

// Hook para gerenciar colaboradores (apenas para masters)
export function useCollaboratorManagement() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from("collaborators")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const createCollaborator = async (
    email: string,
    name: string,
    role: AppRole,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Chamar edge function para criar usuário e colaborador
      const { data, error } = await supabase.functions.invoke("manage-collaborator", {
        body: { action: "create", email, name, role, password },
      });

      if (error) throw error;
      if (data.error) return { success: false, error: data.error };

      await fetchCollaborators();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateCollaborator = async (
    collaboratorId: string,
    updates: Partial<Pick<Collaborator, "name" | "role" | "is_active">>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("collaborators")
        .update(updates)
        .eq("id", collaboratorId);

      if (error) throw error;
      await fetchCollaborators();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const grantPermission = async (
    userId: string,
    permission: AppPermission,
    grantedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("user_permissions").insert({
        user_id: userId,
        permission,
        granted_by: grantedBy,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const revokePermission = async (
    userId: string,
    permission: AppPermission
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("permission", permission);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    collaborators,
    isLoading,
    refetch: fetchCollaborators,
    createCollaborator,
    updateCollaborator,
    grantPermission,
    revokePermission,
  };
}
