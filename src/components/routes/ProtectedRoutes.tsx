import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { logAccessAttempt } from "@/hooks/useAccessLogger";
import Forbidden from "@/pages/Forbidden";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isLoading, isAdminUser, userId } = useUserRole();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showForbidden, setShowForbidden] = useState(false);
  const location = useLocation();
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();

    // Listen for auth state changes to ensure session validation on all visits
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Log unauthorized access attempts
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdminUser && userId && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      
      // Log the unauthorized access attempt
      logAccessAttempt({
        action: "admin_access_denied",
        success: false,
        metadata: {
          attemptedPath: location.pathname,
          reason: "user_not_admin",
        },
      });
      
      setShowForbidden(true);
    }
  }, [isLoading, isAuthenticated, isAdminUser, userId, location.pathname]);

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

  // If authenticated but not admin, show 403 Forbidden page
  if (!isAdminUser || showForbidden) {
    return <Forbidden />;
  }

  // User is admin (master or collaborator)
  return <>{children}</>;
}

interface AppRouteProps {
  children: React.ReactNode;
}

export function AppRoute({ children }: AppRouteProps) {
  const { isLoading, isAdminUser } = useUserRole();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();

    // Check for impersonation session
    const checkImpersonation = () => {
      try {
        const stored = sessionStorage.getItem("impersonation");
        if (stored) {
          const session = JSON.parse(stored);
          const startedAt = new Date(session.startedAt);
          const now = new Date();
          const hoursDiff = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
          
          // Valid impersonation session (less than 2 hours)
          if (hoursDiff < 2 && session.targetUser) {
            setIsImpersonating(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking impersonation:", error);
      }
      setIsImpersonating(false);
    };
    
    checkImpersonation();

    // Listen for auth state changes to ensure session validation on all visits
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
        checkImpersonation();
      }
    );

    return () => subscription.unsubscribe();
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

  // IMPORTANT: If admin is impersonating a user, allow access to app routes
  // This is the key change - we check if there's an active impersonation session
  if (isImpersonating) {
    return <>{children}</>;
  }

  // If user is master or collaborator (and NOT impersonating), redirect to admin
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => subscription.unsubscribe();
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!isChecking) {
          // Only update checking state if we already finished initial check
          setIsChecking(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isChecking]);

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
