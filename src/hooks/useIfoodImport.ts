import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ImportType = "ingredients" | "recipes";
type UserPlan = "free" | "basic" | "pro";

interface UseIfoodImportOptions {
  userId: string | null;
  importType: ImportType;
}

interface UseIfoodImportReturn {
  userPlan: UserPlan;
  usageCount: number;
  remainingUsage: number;
  canImport: boolean;
  isLoading: boolean;
  checkUsage: () => Promise<void>;
}

const PLAN_LIMITS: Record<UserPlan, number> = {
  free: 0,
  basic: 2,
  pro: Infinity,
};

export function useIfoodImport({ userId, importType }: UseIfoodImportOptions): UseIfoodImportReturn {
  const [userPlan, setUserPlan] = useState<UserPlan>("free");
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const maxUsage = PLAN_LIMITS[userPlan];
  const remainingUsage = Math.max(0, maxUsage - usageCount);
  const canImport = userPlan === "pro" || remainingUsage > 0;

  const checkUsage = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Get user plan from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_plan")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.user_plan) {
        setUserPlan(profile.user_plan as UserPlan);
      }

      // Get usage for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageData } = await supabase
        .from("ifood_import_usage")
        .select("id")
        .eq("user_id", userId)
        .eq("import_type", importType)
        .gte("created_at", startOfMonth.toISOString());

      if (usageData) {
        setUsageCount(usageData.length);
      }
    } catch (error) {
      console.error("Error checking import usage:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, importType]);

  useEffect(() => {
    if (userId) {
      checkUsage();
    }
  }, [userId, checkUsage]);

  return {
    userPlan,
    usageCount,
    remainingUsage,
    canImport,
    isLoading,
    checkUsage,
  };
}