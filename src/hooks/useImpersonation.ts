import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface ImpersonationSession {
  token: string;
  targetUser: {
    id: string;
    email: string;
  };
  startedAt: string;
}

export function useImpersonation() {
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; email: string } | null>(null);

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
          return true;
        } else {
          // Session expired, clean up
          sessionStorage.removeItem("impersonation");
          setIsImpersonating(false);
          setImpersonatedUser(null);
        }
      }
    } catch (error) {
      console.error("Error checking impersonation:", error);
      sessionStorage.removeItem("impersonation");
    }
    return false;
  }, []);

  const endImpersonation = useCallback(() => {
    sessionStorage.removeItem("impersonation");
    setIsImpersonating(false);
    setImpersonatedUser(null);
    
    toast({
      title: "Modo Suporte Desativado",
      description: "Voltando para o painel administrativo",
    });
    
    navigate("/admin");
  }, [navigate]);

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
    endImpersonation,
    checkImpersonation,
  };
}
