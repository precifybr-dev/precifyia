import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRBAC, AppPermission } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ShieldX, Loader2 } from "lucide-react";

interface RequirePermissionProps {
  children: ReactNode;
  permission?: AppPermission;
  permissions?: AppPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RequirePermission({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  redirectTo,
}: RequirePermissionProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const location = useLocation();
  
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, isCollaborator } = useRBAC(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
      setIsAuthLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Não é colaborador
  if (!isCollaborator) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // Verificar permissões
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    // Se nenhuma permissão especificada, apenas requer ser colaborador
    hasAccess = true;
  }

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
      <p className="text-muted-foreground max-w-md">
        Você não tem permissão para acessar este recurso. Entre em contato com o administrador se acredita que isso é um erro.
      </p>
    </div>
  );
}
