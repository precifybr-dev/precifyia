import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isLoading, isAdminUser, isMaster, isCollaborator } = useUserRole();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
  }, []);

  // Show loading while checking auth status
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but not admin, redirect to app
  if (!isAdminUser) {
    return <Navigate to="/app" replace />;
  }

  // User is admin (master or collaborator)
  return <>{children}</>;
}

interface AppRouteProps {
  children: React.ReactNode;
}

export function AppRoute({ children }: AppRouteProps) {
  const { isLoading, isMaster, isCollaborator, isAdminUser } = useUserRole();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
  }, []);

  // Show loading while checking auth status
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is master or collaborator, ALWAYS redirect to admin
  // Master should NEVER see end-user dashboard
  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  // Regular user can access app routes
  return <>{children}</>;
}

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isLoading, isAdminUser } = useUserRole();
  const [session, setSession] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsChecking(false);
    };
    checkAuth();
  }, []);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If authenticated, redirect based on role
  if (session?.user) {
    if (isAdminUser) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
