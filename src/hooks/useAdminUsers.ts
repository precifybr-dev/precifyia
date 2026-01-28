import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  business_name: string | null;
  user_plan: string;
  subscription_status: "active" | "trial" | "expired" | "canceled";
  subscription_expires_at: string | null;
  last_access_at: string | null;
  onboarding_step: string | null;
}

export interface UserPayment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  plan_type: string | null;
  description: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [financialHistory, setFinancialHistory] = useState<UserPayment[]>([]);
  const [supportHistory, setSupportHistory] = useState<SupportTicket[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserDetails = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get_user", targetUserId: userId },
      });

      if (error) throw error;
      setUserDetails(data);
      return data;
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do usuário",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { 
          action: "reset_password", 
          targetUserId: userId,
          data: { newPassword }
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Senha resetada com sucesso",
      });
      return true;
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao resetar senha",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const changePlan = useCallback(async (userId: string, newPlan: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { 
          action: "change_plan", 
          targetUserId: userId,
          data: { newPlan }
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Plano alterado com sucesso",
      });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, user_plan: newPlan, subscription_status: 'active' } : u
      ));
      
      return true;
    } catch (err: any) {
      console.error("Error changing plan:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao alterar plano",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const updateStatus = useCallback(async (userId: string, status: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { 
          action: "update_status", 
          targetUserId: userId,
          data: { status }
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Status alterado com sucesso",
      });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, subscription_status: status as AdminUser["subscription_status"] } : u
      ));
      
      return true;
    } catch (err: any) {
      console.error("Error updating status:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao atualizar status",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const extendSubscription = useCallback(async (userId: string, days: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { 
          action: "extend_subscription", 
          targetUserId: userId,
          data: { days }
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: `Assinatura estendida por ${days} dias`,
      });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, subscription_expires_at: data.new_expiry } : u
      ));
      
      return true;
    } catch (err: any) {
      console.error("Error extending subscription:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao estender assinatura",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const getFinancialHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get_financial_history", targetUserId: userId },
      });

      if (error) throw error;
      setFinancialHistory(data.payments || []);
      return data.payments;
    } catch (err: any) {
      console.error("Error fetching financial history:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico financeiro",
        variant: "destructive",
      });
      return [];
    }
  }, []);

  const getSupportHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get_support_history", targetUserId: userId },
      });

      if (error) throw error;
      setSupportHistory(data.tickets || []);
      return data.tickets;
    } catch (err: any) {
      console.error("Error fetching support history:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de suporte",
        variant: "destructive",
      });
      return [];
    }
  }, []);

  const startImpersonation = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "start_impersonation", targetUserId: userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Return all necessary data for the impersonation hook
      return {
        success: true,
        targetUser: data.targetUser,
        impersonationToken: data.impersonationToken,
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        startedAt: data.startedAt,
        sessionData: data.sessionData,
      };
    } catch (err: any) {
      console.error("Error starting impersonation:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao iniciar modo suporte",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const endImpersonation = useCallback(() => {
    sessionStorage.removeItem("impersonation");
    toast({
      title: "Modo Suporte Desativado",
      description: "Voltando para sua conta normal",
    });
  }, []);

  return {
    users,
    isLoading,
    selectedUser,
    setSelectedUser,
    userDetails,
    financialHistory,
    supportHistory,
    fetchUsers,
    getUserDetails,
    resetPassword,
    changePlan,
    updateStatus,
    extendSubscription,
    getFinancialHistory,
    getSupportHistory,
    startImpersonation,
    endImpersonation,
  };
}
