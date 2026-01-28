import { ReactNode } from "react";
import { useRBAC, AppPermission } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface PermissionGateProps {
  children: ReactNode;
  permission?: AppPermission;
  permissions?: AppPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

/**
 * Componente para esconder/mostrar elementos baseado em permissões.
 * Use para botões, links, seções que devem ser visíveis apenas para certas permissões.
 * 
 * @example
 * <PermissionGate permission="manage_collaborators">
 *   <Button>Gerenciar Colaboradores</Button>
 * </PermissionGate>
 * 
 * @example
 * <PermissionGate permissions={["view_users", "edit_users"]} requireAll>
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const [userId, setUserId] = useState<string | undefined>();
  
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, isCollaborator } = useRBAC(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Enquanto carrega, não mostra nada
  if (isLoading) {
    return null;
  }

  // Não é colaborador
  if (!isCollaborator) {
    return <>{fallback}</>;
  }

  // Verificar permissões
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Componente para mostrar conteúdo apenas para masters
 */
export function MasterOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [userId, setUserId] = useState<string | undefined>();
  const { isMaster, isLoading, isCollaborator } = useRBAC(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  if (isLoading) return null;
  if (!isCollaborator || !isMaster()) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Componente para mostrar conteúdo apenas para colaboradores
 */
export function CollaboratorOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [userId, setUserId] = useState<string | undefined>();
  const { isLoading, isCollaborator } = useRBAC(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  if (isLoading) return null;
  if (!isCollaborator) return <>{fallback}</>;

  return <>{children}</>;
}
