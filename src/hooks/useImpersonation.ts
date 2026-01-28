import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationSession {
  token: string;
  targetUser: {
    id: string;
    email: string;
  };
  startedAt: string;
  adminId?: string;
}

// List of critical actions that should be blocked during impersonation
const BLOCKED_ACTIONS = [
  'delete_account',
  'change_email',
  'delete_store',
  'delete_all_data',
  'export_sensitive_data',
];

export function useImpersonation() {
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; email: string } | null>(null);
  const [impersonationToken, setImpersonationToken] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

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
          setImpersonationToken(session.token);
          setSessionStartedAt(session.startedAt);
          return true;
        } else {
          // Session expired, clean up
          sessionStorage.removeItem("impersonation");
          setIsImpersonating(false);
          setImpersonatedUser(null);
          setImpersonationToken(null);
          setSessionStartedAt(null);
        }
      }
    } catch (error) {
      console.error("Error checking impersonation:", error);
      sessionStorage.removeItem("impersonation");
    }
    return false;
  }, []);

  const endImpersonation = useCallback(async () => {
    try {
      // Log the end of impersonation session
      const stored = sessionStorage.getItem("impersonation");
      if (stored) {
        const session: ImpersonationSession = JSON.parse(stored);
        
        await supabase.functions.invoke("admin-users", {
          body: { 
            action: "end_impersonation", 
            targetUserId: session.targetUser.id,
            data: {
              impersonationToken: session.token,
              startedAt: session.startedAt,
            }
          },
        });
      }
    } catch (error) {
      console.error("Error logging impersonation end:", error);
    }

    sessionStorage.removeItem("impersonation");
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setImpersonationToken(null);
    setSessionStartedAt(null);
    
    toast({
      title: "Modo Suporte Desativado",
      description: "Voltando para o painel administrativo",
    });
    
    navigate("/admin");
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
      description: `A ação "${action}" não é permitida no modo suporte`,
      variant: "destructive",
    });
  }, []);

  useEffect(() => {
    checkImpersonation();
    
    // Listen for storage changes (in case of multi-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "impersonation") {
        checkImpersonation();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkImpersonation]);

  return {
    isImpersonating,
    impersonatedUser,
    impersonationToken,
    sessionStartedAt,
    endImpersonation,
    checkImpersonation,
    isActionBlocked,
    showBlockedActionWarning,
  };
}
