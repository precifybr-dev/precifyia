import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminMetrics {
  total_users: number;
  users_today: number;
  users_week: number;
  users_month: number;
  basic_plan_users: number;
  pro_plan_users: number;
  free_plan_users: number;
}

interface MRRStats {
  plan_type: string;
  user_count: number;
  mrr: number;
}

interface RegistrationStats {
  registration_date: string;
  user_count: number;
}

interface RecentUser {
  id: string;
  email: string;
  created_at: string;
  business_name: string | null;
  user_plan: string;
  onboarding_step: string | null;
}

interface AdminAlert {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AccessLog {
  id: string;
  action: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_id: string;
}

interface CalculatedMetrics {
  totalMRR: number;
  arpu: number;
  averageLTV: number;
  churnRate: number;
}

export function useAdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [mrrStats, setMrrStats] = useState<MRRStats[]>([]);
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetrics>({
    totalMRR: 0,
    arpu: 0,
    averageLTV: 0,
    churnRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-stats");

      if (fnError) throw fnError;

      if (data) {
        setMetrics(data.metrics);
        setMrrStats(data.mrrStats || []);
        setRegistrationStats(data.registrationStats || []);
        setRecentUsers(data.recentUsers || []);
        setCalculatedMetrics(data.calculated || {
          totalMRR: 0,
          arpu: 0,
          averageLTV: 0,
          churnRate: 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching admin stats:", err);
      setError(err.message);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const validatedAlerts: AdminAlert[] = (data || []).map((alert: any) => ({
        id: alert.id,
        type: ["info", "warning", "error", "success"].includes(alert.type)
          ? (alert.type as AdminAlert["type"])
          : "info",
        title: alert.title,
        message: alert.message,
        is_read: alert.is_read,
        created_at: alert.created_at,
      }));

      setAlerts(validatedAlerts);
    } catch (err: any) {
      console.error("Error fetching alerts:", err);
    }
  }, []);

  const fetchAccessLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAccessLogs(data || []);
    } catch (err: any) {
      console.error("Error fetching access logs:", err);
    }
  }, []);

  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("admin_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (err: any) {
      console.error("Error marking alert as read:", err);
    }
  }, []);

  const createAlert = useCallback(
    async (
      type: AdminAlert["type"],
      title: string,
      message: string
    ): Promise<boolean> => {
      try {
        const { error } = await supabase.from("admin_alerts").insert({
          type,
          title,
          message,
        });

        if (error) throw error;
        await fetchAlerts();
        return true;
      } catch (err: any) {
        console.error("Error creating alert:", err);
        return false;
      }
    },
    [fetchAlerts]
  );

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await Promise.all([
      fetchAdminStats(),
      fetchAlerts(),
      fetchAccessLogs(),
    ]);

    setIsLoading(false);
  }, [fetchAdminStats, fetchAlerts, fetchAccessLogs]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    // Data
    metrics,
    mrrStats,
    registrationStats,
    recentUsers,
    alerts,
    accessLogs,

    // Calculated metrics
    totalMRR: calculatedMetrics.totalMRR,
    activeUsers: metrics?.total_users || 0,
    churnRate: calculatedMetrics.churnRate,
    averageLTV: calculatedMetrics.averageLTV,
    arpu: calculatedMetrics.arpu,

    // State
    isLoading,
    error,

    // Actions
    refetch: loadAllData,
    markAlertAsRead,
    createAlert,
  };
}
