import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserSecurity {
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  isMaster: boolean;
  isFinanceiro: boolean;
}

export function useUserSecurity(userId: string | undefined) {
  const [security, setSecurity] = useState<UserSecurity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    fetchUserSecurity(userId);
  }, [userId]);

  const fetchUserSecurity = async (uid: string) => {
    try {
      // Verificar se é master
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, is_protected")
        .eq("user_id", uid)
        .maybeSingle();

      const isMaster = roleData?.role === "master" && roleData?.is_protected;

      // Verificar se é colaborador financeiro
      const { data: collaboratorData } = await supabase
        .from("collaborators")
        .select("role, is_active")
        .eq("user_id", uid)
        .eq("is_active", true)
        .maybeSingle();

      const isFinanceiro = collaboratorData?.role === "financeiro" || roleData?.role === "financeiro";

      // Buscar configurações de segurança
      const { data: securityData } = await supabase
        .from("user_security")
        .select("must_change_password, mfa_enabled, mfa_verified")
        .eq("user_id", uid)
        .maybeSingle();

      setSecurity({
        mustChangePassword: securityData?.must_change_password ?? false,
        mfaEnabled: securityData?.mfa_enabled ?? false,
        mfaVerified: securityData?.mfa_verified ?? false,
        isMaster: isMaster ?? false,
        isFinanceiro: isFinanceiro ?? false,
      });
    } catch (error) {
      console.error("Erro ao buscar segurança do usuário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMfaCode = async (email: string) => {
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

  const verifyMfaCode = async (code: string) => {
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

      setSecurity((prev) => prev ? { ...prev, mfaVerified: true } : null);
      
      toast({
        title: "Verificado!",
        description: "Código verificado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error("Erro ao verificar código MFA:", error);
      return false;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      // Atualizar flag no banco
      await supabase
        .from("user_security")
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      setSecurity((prev) => prev ? { ...prev, mustChangePassword: false } : null);

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logAccess = async (action: string, success: boolean, metadata?: Record<string, unknown>) => {
    if (!userId) return;

    try {
      await supabase.functions.invoke("log-access", {
        body: { userId, action, success, metadata },
      });
    } catch (error) {
      console.error("Erro ao registrar acesso:", error);
    }
  };

  return {
    security,
    isLoading,
    sendMfaCode,
    verifyMfaCode,
    updatePassword,
    logAccess,
    refetch: () => userId && fetchUserSecurity(userId),
  };
}
