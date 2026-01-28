import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationSession {
  sessionToken: string;
  targetUser: {
    id: string;
    email: string;
  };
  adminId: string;
  adminEmail: string;
  startedAt: string;
  accessType: 'readonly';
  maxDurationMinutes: number;
  consentId: string;
  actionsLog: Array<{ action: string; timestamp: string; blocked: boolean }>;
}

// Maximum session duration in minutes
const MAX_SESSION_DURATION_MINUTES = 30;

// Inactivity timeout in minutes
const INACTIVITY_TIMEOUT_MINUTES = 10;

export function useImpersonation() {
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; email: string } | null>(null);
  const [adminInfo, setAdminInfo] = useState<{ id: string; email: string } | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [actionsLog, setActionsLog] = useState<Array<{ action: string; timestamp: string; blocked: boolean }>>([]);
  
  // Refs for timers
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check for active impersonation on mount
  const checkImpersonation = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("support_session");
      if (stored) {
        const session: ImpersonationSession = JSON.parse(stored);
        
        // Check if session is valid (within max duration)
        const startedAt = new Date(session.startedAt);
        const now = new Date();
        const minutesDiff = (now.getTime() - startedAt.getTime()) / (1000 * 60);
        
        if (minutesDiff < session.maxDurationMinutes && session.targetUser) {
          setIsImpersonating(true);
          setImpersonatedUser(session.targetUser);
          setAdminInfo({ id: session.adminId, email: session.adminEmail });
          setSessionStartedAt(session.startedAt);
          setSessionToken(session.sessionToken);
          setActionsLog(session.actionsLog || []);
          return true;
        } else {
          // Session expired, clean up
          endImpersonation(true, 'session_timeout');
        }
      }
    } catch (error) {
      console.error("Error checking impersonation:", error);
      sessionStorage.removeItem("support_session");
    }
    return false;
  }, []);

  // Start impersonation - called after successful API response (READ-ONLY mode)
  const startImpersonation = useCallback(async (
    targetUser: { id: string; email: string },
    adminId: string,
    adminEmail: string,
    token: string,
    maxDurationMinutes: number,
    consentId: string
  ) => {
    setIsLoading(true);
    
    try {
      // Store impersonation session info
      const session: ImpersonationSession = {
        sessionToken: token,
        targetUser,
        adminId,
        adminEmail,
        startedAt: new Date().toISOString(),
        accessType: 'readonly',
        maxDurationMinutes,
        consentId,
        actionsLog: [],
      };

      sessionStorage.setItem("support_session", JSON.stringify(session));

      // Update state
      setIsImpersonating(true);
      setImpersonatedUser(targetUser);
      setAdminInfo({ id: adminId, email: adminEmail });
      setSessionStartedAt(session.startedAt);
      setSessionToken(token);
      setActionsLog([]);

      toast({
        title: "Modo Suporte Ativado (Somente Leitura)",
        description: `Visualizando conta: ${targetUser.email}. Alterações desativadas.`,
      });

      // Navigate to user's area
      navigate("/app");
      
      return true;
    } catch (error: any) {
      console.error("Error starting impersonation:", error);
      sessionStorage.removeItem("support_session");
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

  // End impersonation
  const endImpersonation = useCallback(async (silent = false, reason = 'manual') => {
    try {
      const stored = sessionStorage.getItem("support_session");
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
              sessionToken: session.sessionToken,
              startedAt: session.startedAt,
              durationSeconds,
              autoEnded: reason !== 'manual',
              endReason: reason,
              actionsLog: session.actionsLog,
            }
          },
        });
      } catch (logError) {
        console.error("Error logging impersonation end:", logError);
      }

      // Clear impersonation state
      sessionStorage.removeItem("support_session");
      setIsImpersonating(false);
      setImpersonatedUser(null);
      setAdminInfo(null);
      setSessionStartedAt(null);
      setSessionToken(null);
      setActionsLog([]);

      // Clear timers
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      if (!silent) {
        const reasonMessages: Record<string, string> = {
          manual: 'Sessão encerrada manualmente',
          session_timeout: 'Sessão expirou (tempo máximo atingido)',
          inactivity: 'Sessão encerrada por inatividade',
        };
        toast({
          title: "Modo Suporte Desativado",
          description: `${reasonMessages[reason] || reason}. Duração: ${Math.floor(durationSeconds / 60)} minutos`,
        });
      }

      // Redirect to admin panel
      navigate("/admin");
    } catch (error) {
      console.error("Error ending impersonation:", error);
      sessionStorage.removeItem("support_session");
      navigate("/admin");
    }
  }, [navigate]);

  // Log an attempted action (for audit trail)
  const logAction = useCallback((action: string, blocked: boolean) => {
    if (!isImpersonating) return;
    
    const newAction = { action, timestamp: new Date().toISOString(), blocked };
    const newLog = [...actionsLog, newAction];
    setActionsLog(newLog);
    
    // Update session storage
    try {
      const stored = sessionStorage.getItem("support_session");
      if (stored) {
        const session: ImpersonationSession = JSON.parse(stored);
        session.actionsLog = newLog;
        sessionStorage.setItem("support_session", JSON.stringify(session));
      }
    } catch (error) {
      console.error("Error updating actions log:", error);
    }
  }, [isImpersonating, actionsLog]);

  // Block any write action in read-only mode
  const blockWriteAction = useCallback((action: string): boolean => {
    if (!isImpersonating) return false;
    
    logAction(action, true);
    
    toast({
      title: "Ação bloqueada",
      description: "Modo suporte somente leitura - alterações desativadas",
      variant: "destructive",
    });
    
    return true;
  }, [isImpersonating, logAction]);

  // Get session duration in minutes
  const getSessionDuration = useCallback((): number => {
    if (!sessionStartedAt) return 0;
    return Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 60000);
  }, [sessionStartedAt]);

  // Get remaining time in minutes
  const getRemainingTime = useCallback((): number => {
    if (!sessionStartedAt) return 0;
    const elapsed = (Date.now() - new Date(sessionStartedAt).getTime()) / 60000;
    return Math.max(0, MAX_SESSION_DURATION_MINUTES - elapsed);
  }, [sessionStartedAt]);

  // Setup timers when impersonating
  useEffect(() => {
    if (!isImpersonating || !sessionStartedAt) return;

    // Session timeout timer
    const remainingMs = getRemainingTime() * 60 * 1000;
    if (remainingMs > 0) {
      sessionTimerRef.current = setTimeout(() => {
        endImpersonation(false, 'session_timeout');
      }, remainingMs);
    }

    // Inactivity timer
    const checkInactivity = () => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs >= INACTIVITY_TIMEOUT_MINUTES * 60 * 1000) {
        endImpersonation(false, 'inactivity');
      }
    };

    inactivityTimerRef.current = setInterval(checkInactivity, 60000); // Check every minute

    // Listen for user activity
    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [isImpersonating, sessionStartedAt, getRemainingTime, endImpersonation, resetInactivityTimer]);

  useEffect(() => {
    checkImpersonation();
    
    // Listen for storage changes (in case of multi-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "support_session") {
        if (!e.newValue) {
          // Session was ended in another tab
          setIsImpersonating(false);
          setImpersonatedUser(null);
          setAdminInfo(null);
          setSessionStartedAt(null);
          setSessionToken(null);
          setActionsLog([]);
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
    sessionToken,
    actionsLog,
    accessType: 'readonly' as const,
    startImpersonation,
    endImpersonation,
    checkImpersonation,
    blockWriteAction,
    logAction,
    getSessionDuration,
    getRemainingTime,
    resetInactivityTimer,
  };
}
