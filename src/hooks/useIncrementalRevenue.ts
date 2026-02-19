import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface IncrementalRevenueUsage {
  used: number;
  limit: number | null;
  plan: string;
}

export interface IncrementalRevenueResult {
  productName: string;
  originalPrice: number;
  newPrice: number;
  differencePerUnit: number;
  monthlyVolume: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export function useIncrementalRevenue() {
  const { toast } = useToast();
  const [usage, setUsage] = useState<IncrementalRevenueUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      const plan = profile?.user_plan || "free";

      const { data: planFeature } = await supabase
        .from("plan_features")
        .select("usage_limit, enabled")
        .eq("plan", plan)
        .eq("feature", "incremental_revenue")
        .maybeSingle();

      if (!planFeature?.enabled) {
        setUsage({ used: 0, limit: 0, plan });
        return;
      }

      const planLimit = planFeature.usage_limit; // null = unlimited

      // Get bonus credits
      const { data: bonusData } = await supabase
        .from("user_bonus_credits")
        .select("credits")
        .eq("user_id", user.id)
        .eq("feature", "incremental_revenue")
        .maybeSingle();

      const bonus = (bonusData as any)?.credits ?? 0;
      const limit = planLimit !== null ? planLimit + bonus : planLimit;

      // Count usage - free = all-time, paid = monthly
      let query = supabase
        .from("strategic_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("endpoint", "incremental_revenue");

      if (plan !== "free") {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        query = query.gte("created_at", monthStart.toISOString());
      }

      const { count } = await query;
      setUsage({ used: count || 0, limit, plan });
    } catch {
      // Non-critical
    }
  }, []);

  const canCalculate = useCallback((): boolean => {
    if (!usage) return false;
    if (usage.limit === null) return true; // unlimited
    return usage.used < usage.limit;
  }, [usage]);

  const isAtLimit = useCallback((): boolean => {
    if (!usage) return false;
    if (usage.limit === null) return false;
    return usage.used >= usage.limit;
  }, [usage]);

  const recordUsage = useCallback(async (metadata?: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase.from("strategic_usage_logs").insert({
        user_id: user.id,
        endpoint: "incremental_revenue",
        tokens_used: 0,
        metadata: metadata || {},
      });

      // Update local usage
      setUsage(prev => prev ? { ...prev, used: prev.used + 1 } : prev);
      return true;
    } catch {
      return false;
    }
  }, []);

  const calculateRevenue = useCallback((
    productName: string,
    originalPrice: number,
    newPrice: number,
    monthlyVolume: number,
  ): IncrementalRevenueResult | null => {
    const diff = newPrice - originalPrice;
    if (diff <= 0) return null;

    return {
      productName,
      originalPrice,
      newPrice,
      differencePerUnit: diff,
      monthlyVolume,
      monthlyRevenue: diff * monthlyVolume,
      annualRevenue: diff * monthlyVolume * 12,
    };
  }, []);

  return {
    usage,
    isLoading,
    fetchUsage,
    canCalculate,
    isAtLimit,
    recordUsage,
    calculateRevenue,
  };
}
