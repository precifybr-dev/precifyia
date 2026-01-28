import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminSecurityState {
  isVerified: boolean;
  requiresMfa: boolean;
  role: string | null;
  lastVerification: string | null;
}

const MFA_REQUIRED_ROLES = ["master", "financeiro"];
const VERIFICATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

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

      // Verificar status de MFA
      const { data: securityData } = await supabase
        .from("user_security")
        .select("mfa_verified, mfa_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Verificar se a verificação ainda é válida (baseado em sessão)
      const storedVerification = sessionStorage.getItem("admin_mfa_verified");
      let isVerified = false;

      if (storedVerification) {
        const verificationData = JSON.parse(storedVerification);
        const verificationTime = new Date(verificationData.timestamp).getTime();
        const now = Date.now();

        if (now - verificationTime < VERIFICATION_EXPIRY_MS && verificationData.userId === session.user.id) {
          isVerified = true;
        } else {
          // Verificação expirada, limpar
          sessionStorage.removeItem("admin_mfa_verified");
        }
      }

      // Se não requer MFA, está automaticamente verificado
      if (!requiresMfa) {
        isVerified = true;
      }

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

  const requestMfaCode = async (email: string): Promise<{ success: boolean; devCode?: string }> => {
    if (!userId) return { success: false };

    try {
      const { data, error } = await supabase.functions.invoke("send-mfa-code", {
        body: { email, userId },
      });

      if (error) throw error;

      toast({
        title: "Código enviado",
        description: "Verifique seu email para o código de verificação.",
      });

      return { success: true, devCode: data?.devCode };
    } catch (error) {
      console.error("Erro ao enviar código MFA:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o código de verificação.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const verifyMfaCode = async (code: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("verify-mfa-code", {
        body: { userId, code },
      });

      if (error || !data?.valid) {
        toast({
          title: "Código inválido",
          description: data?.error || "O código informado está incorreto ou expirado.",
          variant: "destructive",
        });
        return false;
      }

      // Salvar verificação na sessão
      const verificationData = {
        userId,
        timestamp: new Date().toISOString(),
        verified: true,
      };
      sessionStorage.setItem("admin_mfa_verified", JSON.stringify(verificationData));

      // Registrar acesso no log
      await logAdminAccess("mfa_admin_verified", true, { role: state.role });

      setState((prev) => ({
        ...prev,
        isVerified: true,
        lastVerification: verificationData.timestamp,
      }));

      toast({
        title: "Verificado!",
        description: "Acesso ao painel administrativo liberado.",
      });

      return true;
    } catch (error) {
      console.error("Erro ao verificar código MFA:", error);
      return false;
    }
  };

  const logAdminAccess = async (
    action: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ) => {
    if (!userId) return;

    try {
      // Capturar informações do dispositivo
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
          userId,
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
    requestMfaCode,
    verifyMfaCode,
    logAdminAccess,
    invalidateSession,
    refresh: checkSecurityStatus,
  };
}
