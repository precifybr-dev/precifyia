import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";

interface AdminSecurityState {
  isVerified: boolean;
  requiresMfa: boolean;
  role: string | null;
  lastVerification: string | null;
}

const MFA_REQUIRED_ROLES = ["master", "financeiro"];
const VERIFICATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos
const REAUTH_WINDOW_MS = 120 * 1000; // 2 minutos para completar o fluxo Google

export function useAdminSecurity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<AdminSecurityState>({
    isVerified: false,
    requiresMfa: false,
    role: null,
    lastVerification: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const checkSecurityStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      setUserId(session.user.id);

      // Verificar role do usuário
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      const userRole = roleData?.role || null;

      // Verificar se é colaborador
      const { data: collaboratorData } = await supabase
        .from("collaborators")
        .select("role, is_active")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      const effectiveRole = userRole || collaboratorData?.role || null;
      const requiresMfa = MFA_REQUIRED_ROLES.includes(effectiveRole || "");

      // Verificar se há um pending de re-autenticação Google
      const pendingMfa = sessionStorage.getItem("admin_mfa_pending");
      let isVerified = false;

      if (pendingMfa) {
        const pendingTime = parseInt(pendingMfa, 10);
        const now = Date.now();

        if (now - pendingTime < REAUTH_WINDOW_MS) {
          // Usuário acabou de re-autenticar via Google — marcar como verificado
          const verificationData = {
            userId: session.user.id,
            timestamp: new Date().toISOString(),
            verified: true,
          };
          sessionStorage.setItem("admin_mfa_verified", JSON.stringify(verificationData));
          sessionStorage.removeItem("admin_mfa_pending");
          isVerified = true;

          // Registrar acesso no log
          await logAdminAccess("google_reauth_verified", true, { role: effectiveRole });

          toast({
            title: "Verificado!",
            description: "Acesso ao painel administrativo liberado.",
          });
        } else {
          // Pendente expirado
          sessionStorage.removeItem("admin_mfa_pending");
        }
      }

      // Verificar se a verificação ainda é válida (baseado em sessão)
      if (!isVerified) {
        const storedVerification = sessionStorage.getItem("admin_mfa_verified");
        if (storedVerification) {
          const verificationData = JSON.parse(storedVerification);
          const verificationTime = new Date(verificationData.timestamp).getTime();
          const now = Date.now();

          if (now - verificationTime < VERIFICATION_EXPIRY_MS && verificationData.userId === session.user.id) {
            isVerified = true;
          } else {
            sessionStorage.removeItem("admin_mfa_verified");
          }
        }
      }

      // Se não requer MFA, está automaticamente verificado
      if (!requiresMfa) {
        isVerified = true;
      }

      const storedVerification = sessionStorage.getItem("admin_mfa_verified");

      setState({
        isVerified,
        requiresMfa,
        role: effectiveRole,
        lastVerification: storedVerification ? JSON.parse(storedVerification).timestamp : null,
      });
    } catch (error) {
      console.error("Erro ao verificar segurança admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWithGoogle = async () => {
    // Salvar timestamp antes de redirecionar
    sessionStorage.setItem("admin_mfa_pending", Date.now().toString());

    await logAdminAccess("google_reauth_requested", true, { role: state.role });

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/admin",
    } as any);

    if (result && 'error' in result && result.error) {
      sessionStorage.removeItem("admin_mfa_pending");
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a verificação com Google.",
        variant: "destructive",
      });
    }
  };

  const logAdminAccess = async (
    action: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ) => {
    const currentUserId = userId;
    if (!currentUserId) {
      // Try to get from session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
    }

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
      };

      await supabase.functions.invoke("log-access", {
        body: {
          action,
          success,
          metadata: {
            ...metadata,
            device: deviceInfo,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao registrar acesso:", error);
    }
  };

  const invalidateSession = useCallback(() => {
    sessionStorage.removeItem("admin_mfa_verified");
    setState((prev) => ({
      ...prev,
      isVerified: false,
      lastVerification: null,
    }));
  }, []);

  return {
    isVerified: state.isVerified,
    requiresMfa: state.requiresMfa,
    role: state.role,
    lastVerification: state.lastVerification,
    isLoading,
    userId,
    verifyWithGoogle,
    logAdminAccess,
    invalidateSession,
    refresh: checkSecurityStatus,
  };
}
