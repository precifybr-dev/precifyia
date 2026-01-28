import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailyActiveUsers {
  activity_date: string;
  active_users: number;
}

interface SessionStats {
  avg_duration_minutes: number;
  total_sessions: number;
  sessions_today: number;
}

interface FeatureUsage {
  feature_name: string;
  usage_count: number;
  unique_users: number;
}

interface InactiveUser {
  user_id: string;
  email: string;
  business_name: string | null;
  last_activity: string;
  days_inactive: number;
}

interface ChurnRiskUser {
  user_id: string;
  email: string;
  business_name: string | null;
  user_plan: string;
  last_activity: string;
  previous_activity_level: string;
  days_since_active: number;
}

interface EventCategory {
  event_category: string;
  event_count: number;
  unique_users: number;
}

interface HourlyUsage {
  hour_of_day: number;
  event_count: number;
}

export function useUsageMetrics() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  // Metrics state
  const [dailyActiveUsers, setDailyActiveUsers] = useState<DailyActiveUsers[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [topFeatures, setTopFeatures] = useState<FeatureUsage[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [churnRiskUsers, setChurnRiskUsers] = useState<ChurnRiskUser[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [hourlyUsage, setHourlyUsage] = useState<HourlyUsage[]>([]);
  const [inactiveDaysThreshold, setInactiveDaysThreshold] = useState(7);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all metrics in parallel
      const [
        dauResult,
        sessionResult,
        featuresResult,
        inactiveResult,
        churnResult,
        categoriesResult,
        hourlyResult,
      ] = await Promise.all([
        supabase.rpc("get_daily_active_users", { days_back: period }),
        supabase.rpc("get_average_session_duration"),
        supabase.rpc("get_most_used_features", { days_back: period }),
        supabase.rpc("get_inactive_users", { inactive_days: inactiveDaysThreshold }),
        supabase.rpc("get_churn_risk_users"),
        supabase.rpc("get_event_stats_by_category", { days_back: period }),
        supabase.rpc("get_usage_by_hour", { days_back: 7 }),
      ]);

      if (dauResult.data) {
        setDailyActiveUsers(dauResult.data);
      }

      if (sessionResult.data && sessionResult.data.length > 0) {
        setSessionStats(sessionResult.data[0]);
      }

      if (featuresResult.data) {
        setTopFeatures(featuresResult.data);
      }

      if (inactiveResult.data) {
        setInactiveUsers(inactiveResult.data);
      }

      if (churnResult.data) {
        setChurnRiskUsers(churnResult.data);
      }

      if (categoriesResult.data) {
        setEventCategories(categoriesResult.data);
      }

      if (hourlyResult.data) {
        setHourlyUsage(hourlyResult.data);
      }
    } catch (error: any) {
      console.error("Error fetching usage metrics:", error);
      toast({
        title: "Erro ao carregar métricas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [period, inactiveDaysThreshold, toast]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Calculate summary stats
  const todayDAU = dailyActiveUsers.length > 0
    ? dailyActiveUsers[dailyActiveUsers.length - 1]?.active_users || 0
    : 0;

  const avgDAU = dailyActiveUsers.length > 0
    ? Math.round(
        dailyActiveUsers.reduce((sum, d) => sum + d.active_users, 0) / dailyActiveUsers.length
      )
    : 0;

  const totalEvents = eventCategories.reduce((sum, c) => sum + c.event_count, 0);

  return {
    isLoading,
    period,
    setPeriod,
    inactiveDaysThreshold,
    setInactiveDaysThreshold,
    refetch: fetchMetrics,
    // Metrics data
    dailyActiveUsers,
    sessionStats,
    topFeatures,
    inactiveUsers,
    churnRiskUsers,
    eventCategories,
    hourlyUsage,
    // Summary stats
    todayDAU,
    avgDAU,
    totalEvents,
  };
}
