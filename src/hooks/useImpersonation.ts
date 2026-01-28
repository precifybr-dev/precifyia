import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationSession {
  impersonationToken: string;
  targetUser: {
    id: string;
    email: string;
  };
  adminId: string;
  adminEmail: string;
  startedAt: string;
  originalSession: {
    accessToken: string;
    refreshToken: string;
  };
}

// Critical actions blocked during impersonation
const BLOCKED_ACTIONS = [
  'delete_account',
  'change_email',
  'delete_store',
  'delete_all_data',
  'export_sensitive_data',
  'change_password',
];

export function useImpersonation() {
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; email: string } | null>(null);
  const [adminInfo, setAdminInfo] = useState<{ id: string; email: string } | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for active impersonation on mount
  const checkImpersonation = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("impersonation");
      if (stored) {
        const session: ImpersonationSession = JSON.parse(stored);
        
        // Check if session is valid (less than 2 hours old)
        const startedAt = new Date(session.startedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 2 && session.targetUser) {
          setIsImpersonating(true);
          setImpersonatedUser(session.targetUser);
          setAdminInfo({ id: session.adminId, email: session.adminEmail });
          setSessionStartedAt(session.startedAt);
          return true;
        } else {
          // Session expired, clean up and restore
          endImpersonation(true);
        }
      }
    } catch (error) {
      console.error("Error checking impersonation:", error);
      sessionStorage.removeItem("impersonation");
    }
    return false;
  }, []);

  // Start impersonation - called after successful API response
  const startImpersonation = useCallback(async (
    targetUser: { id: string; email: string },
    adminId: string,
    adminEmail: string,
    impersonationToken: string,
    sessionData: { token_hash: string; email: string }
  ) => {
    setIsLoading(true);
    
    try {
      // Store current admin session BEFORE switching
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        throw new Error("No active session to preserve");
      }

      // Store impersonation info with original session
      const impersonationSession: ImpersonationSession = {
        impersonationToken,
        targetUser,
        adminId,
        adminEmail,
        startedAt: new Date().toISOString(),
        originalSession: {
          accessToken: currentSession.access_token,
          refreshToken: currentSession.refresh_token,
        },
      };

      sessionStorage.setItem("impersonation", JSON.stringify(impersonationSession));

      // Now sign in as the target user using the magic link token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: sessionData.token_hash,
        type: 'magiclink',
      });

      if (verifyError) {
        console.error("[IMPERSONATION] Failed to verify OTP:", verifyError);
        sessionStorage.removeItem("impersonation");
        throw verifyError;
      }

      // Update state
      setIsImpersonating(true);
      setImpersonatedUser(targetUser);
      setAdminInfo({ id: adminId, email: adminEmail });
      setSessionStartedAt(impersonationSession.startedAt);

      toast({
        title: "Modo Suporte Ativado",
        description: `Visualizando como: ${targetUser.email}`,
      });

      // Navigate to user's area
      navigate("/app");
      
      return true;
    } catch (error: any) {
      console.error("Error starting impersonation:", error);
      sessionStorage.removeItem("impersonation");
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar modo suporte",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // End impersonation and restore admin session
  const endImpersonation = useCallback(async (silent = false) => {
    try {
      const stored = sessionStorage.getItem("impersonation");
      if (!stored) return;

      const session: ImpersonationSession = JSON.parse(stored);
      
      // Calculate duration
      const durationSeconds = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      );

      // Log the end of impersonation
      try {
        await supabase.functions.invoke("admin-users", {
          body: { 
            action: "end_impersonation", 
            targetUserId: session.targetUser.id,
            data: {
              impersonationToken: session.impersonationToken,
              startedAt: session.startedAt,
              durationSeconds,
            }
          },
        });
      } catch (logError) {
        console.error("Error logging impersonation end:", logError);
      }

      // Restore original admin session
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: session.originalSession.accessToken,
        refresh_token: session.originalSession.refreshToken,
      });

      if (restoreError) {
        console.error("Error restoring admin session:", restoreError);
        // If restore fails, sign out and redirect to login
        await supabase.auth.signOut();
        sessionStorage.removeItem("impersonation");
        navigate("/login");
        return;
      }

      // Clear impersonation state
      sessionStorage.removeItem("impersonation");
      setIsImpersonating(false);
      setImpersonatedUser(null);
      setAdminInfo(null);
      setSessionStartedAt(null);

      if (!silent) {
        toast({
          title: "Modo Suporte Desativado",
          description: `Sessão encerrada após ${Math.floor(durationSeconds / 60)} minutos`,
        });
      }

      // Redirect to admin panel
      navigate("/admin");
    } catch (error) {
      console.error("Error ending impersonation:", error);
      sessionStorage.removeItem("impersonation");
      await supabase.auth.signOut();
      navigate("/login");
    }
  }, [navigate]);

  // Check if a specific action is blocked during impersonation
  const isActionBlocked = useCallback((action: string): boolean => {
    if (!isImpersonating) return false;
    return BLOCKED_ACTIONS.includes(action);
  }, [isImpersonating]);

  // Show warning when trying to perform a blocked action
  const showBlockedActionWarning = useCallback((action: string) => {
    toast({
      title: "Ação bloqueada",
      description: `A ação "${action}" não é permitida no modo suporte. Ações críticas são bloqueadas para proteção do usuário.`,
      variant: "destructive",
    });
  }, []);

  // Get session duration in minutes
  const getSessionDuration = useCallback((): number => {
    if (!sessionStartedAt) return 0;
    return Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 60000);
  }, [sessionStartedAt]);

  useEffect(() => {
    checkImpersonation();
    
    // Listen for storage changes (in case of multi-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "impersonation") {
        if (!e.newValue) {
          // Impersonation was ended in another tab
          setIsImpersonating(false);
          setImpersonatedUser(null);
          setAdminInfo(null);
          setSessionStartedAt(null);
        } else {
          checkImpersonation();
        }
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkImpersonation]);

  return {
    isImpersonating,
    impersonatedUser,
    adminInfo,
    sessionStartedAt,
    isLoading,
    startImpersonation,
    endImpersonation,
    checkImpersonation,
    isActionBlocked,
    showBlockedActionWarning,
    getSessionDuration,
  };
}
