import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlanFeature {
  plan: string;
  feature: string;
  enabled: boolean;
  usage_limit: number | null;
}

export function usePlanFeatures() {
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user plan
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_plan")
          .eq("user_id", user.id)
          .maybeSingle();

        const plan = profile?.user_plan || "free";
        setUserPlan(plan);

        // Get features for this plan
        const { data } = await supabase
          .from("plan_features")
          .select("*")
          .eq("plan", plan);

        if (data) {
          setFeatures(data as PlanFeature[]);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const isFeatureEnabled = useCallback(
    (feature: string): boolean => {
      const f = features.find((pf) => pf.feature === feature);
      return f?.enabled ?? false;
    },
    [features]
  );

  const getFeatureLimit = useCallback(
    (feature: string): number | null => {
      const f = features.find((pf) => pf.feature === feature);
      return f?.usage_limit ?? null;
    },
    [features]
  );

  return { features, userPlan, loading, isFeatureEnabled, getFeatureLimit };
}
