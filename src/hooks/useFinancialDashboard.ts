import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FinancialSummary {
  total_revenue: number;
  mrr: number;
  projected_next_month: number;
  average_ticket: number;
  total_payment_links: number;
  paid_links: number;
  pending_links: number;
  failed_links: number;
  conversion_rate: number;
}

interface RevenueByPlan {
  plan_type: string;
  user_count: number;
  monthly_revenue: number;
  percentage: number;
}

interface RevenueByPeriod {
  period_date: string;
  revenue: number;
  payment_count: number;
}

interface RenewalStats {
  expiring_today: number;
  expiring_7_days: number;
  expiring_15_days: number;
  expiring_30_days: number;
  potential_revenue_today: number;
  potential_revenue_7_days: number;
  potential_revenue_15_days: number;
  potential_revenue_30_days: number;
}

interface ExpiringByPlan {
  plan_type: string;
  user_count: number;
  potential_revenue: number;
}

interface ExpiringUser {
  id: string;
  email: string;
  business_name: string | null;
  user_plan: string;
  subscription_expires_at: string;
  days_until_expiry: number;
}

export function useFinancialDashboard() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [renewalStats, setRenewalStats] = useState<RenewalStats | null>(null);
  const [expiringByPlan, setExpiringByPlan] = useState<ExpiringByPlan[]>([]);
  const [expiringUsers, setExpiringUsers] = useState<ExpiringUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_financial_summary");
      if (error) throw error;
      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      setError(err.message);
    }
  }, []);

  const fetchRevenueByPlan = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_revenue_by_plan");
      if (error) throw error;
      setRevenueByPlan(data || []);
    } catch (err: any) {
      console.error("Error fetching revenue by plan:", err);
    }
  }, []);

  const fetchRevenueByPeriod = useCallback(async (daysBack: number = 30) => {
    try {
      const { data, error } = await supabase.rpc("get_revenue_by_period", {
        days_back: daysBack,
      });
      if (error) throw error;
      setRevenueByPeriod(data || []);
    } catch (err: any) {
      console.error("Error fetching revenue by period:", err);
    }
  }, []);

  const fetchRenewalStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_renewal_stats");
      if (error) throw error;
      if (data && data.length > 0) {
        setRenewalStats(data[0]);
      }
    } catch (err: any) {
      console.error("Error fetching renewal stats:", err);
    }
  }, []);

  const fetchExpiringByPlan = useCallback(async (daysAhead: number = 30) => {
    try {
      const { data, error } = await supabase.rpc("get_expiring_users_by_plan", {
        days_ahead: daysAhead,
      });
      if (error) throw error;
      setExpiringByPlan(data || []);
    } catch (err: any) {
      console.error("Error fetching expiring by plan:", err);
    }
  }, []);

  const fetchExpiringUsers = useCallback(async () => {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, business_name, user_plan, subscription_expires_at")
        .eq("subscription_status", "active")
        .not("subscription_expires_at", "is", null)
        .lte("subscription_expires_at", thirtyDaysFromNow.toISOString())
        .order("subscription_expires_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      // Map to include email - we'll need to get this from admin-users function or auth
      const usersWithDays: ExpiringUser[] = (data || []).map((profile: any) => {
        const expiryDate = new Date(profile.subscription_expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: profile.user_id,
          email: "", // Will be populated if we fetch from admin function
          business_name: profile.business_name,
          user_plan: profile.user_plan || "free",
          subscription_expires_at: profile.subscription_expires_at,
          days_until_expiry: daysUntilExpiry,
        };
      });

      setExpiringUsers(usersWithDays);
    } catch (err: any) {
      console.error("Error fetching expiring users:", err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await Promise.all([
      fetchFinancialSummary(),
      fetchRevenueByPlan(),
      fetchRevenueByPeriod(30),
      fetchRenewalStats(),
      fetchExpiringByPlan(30),
      fetchExpiringUsers(),
    ]);

    setIsLoading(false);
  }, [
    fetchFinancialSummary,
    fetchRevenueByPlan,
    fetchRevenueByPeriod,
    fetchRenewalStats,
    fetchExpiringByPlan,
    fetchExpiringUsers,
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    // Data
    summary,
    revenueByPlan,
    revenueByPeriod,
    renewalStats,
    expiringByPlan,
    expiringUsers,

    // State
    isLoading,
    error,

    // Actions
    refetch: loadAllData,
    fetchRevenueByPeriod,
    fetchExpiringByPlan,
  };
}
