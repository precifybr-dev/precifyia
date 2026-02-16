import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const COST_PER_1K_TOKENS = 0.01; // USD - Gemini Flash
const CLOUD_COST_PER_CALL = 0.001; // USD - DB + Functions overhead

interface EndpointMetric {
  endpoint: string;
  calls: number;
  total_tokens: number;
  unique_users: number;
  ai_cost: number;
  cloud_cost: number;
  total_cost: number;
  avg_tokens_per_call: number;
}

interface UserMetric {
  user_id: string;
  email: string | null;
  business_name: string | null;
  user_plan: string | null;
  calls: number;
  total_tokens: number;
  total_cost: number;
}

interface DailyMetric {
  day: string;
  calls: number;
  total_tokens: number;
  ai_cost: number;
  cloud_cost: number;
  total_cost: number;
}

interface CloudCostMetrics {
  byEndpoint: EndpointMetric[];
  byUser: UserMetric[];
  daily: DailyMetric[];
  totals: {
    totalCalls: number;
    totalTokens: number;
    totalUsers: number;
    totalAICost: number;
    totalCloudCost: number;
    totalCost: number;
    avgCostPerUser: number;
    avgCostPerCall: number;
  };
}

export function useCloudCosts(daysBack: number = 30) {
  const [data, setData] = useState<CloudCostMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: raw, error: rpcError } = await supabase.rpc(
        "get_cloud_cost_metrics" as any,
        { days_back: daysBack }
      );

      if (rpcError) throw rpcError;

      const result = raw as any;

      const byEndpoint: EndpointMetric[] = (result.by_endpoint || []).map((e: any) => {
        const tokens = Number(e.total_tokens) || 0;
        const calls = Number(e.calls) || 0;
        const aiCost = (tokens / 1000) * COST_PER_1K_TOKENS;
        const cloudCost = calls * CLOUD_COST_PER_CALL;
        return {
          endpoint: e.endpoint,
          calls,
          total_tokens: tokens,
          unique_users: Number(e.unique_users) || 0,
          ai_cost: aiCost,
          cloud_cost: cloudCost,
          total_cost: aiCost + cloudCost,
          avg_tokens_per_call: calls > 0 ? Math.round(tokens / calls) : 0,
        };
      });

      const byUser: UserMetric[] = (result.by_user || []).map((u: any) => {
        const tokens = Number(u.total_tokens) || 0;
        const calls = Number(u.calls) || 0;
        const aiCost = (tokens / 1000) * COST_PER_1K_TOKENS;
        const cloudCost = calls * CLOUD_COST_PER_CALL;
        return {
          user_id: u.user_id,
          email: u.email,
          business_name: u.business_name,
          user_plan: u.user_plan,
          calls,
          total_tokens: tokens,
          total_cost: aiCost + cloudCost,
        };
      });

      const daily: DailyMetric[] = (result.daily || []).map((d: any) => {
        const tokens = Number(d.total_tokens) || 0;
        const calls = Number(d.calls) || 0;
        const aiCost = (tokens / 1000) * COST_PER_1K_TOKENS;
        const cloudCost = calls * CLOUD_COST_PER_CALL;
        return {
          day: d.day,
          calls,
          total_tokens: tokens,
          ai_cost: Number(aiCost.toFixed(4)),
          cloud_cost: Number(cloudCost.toFixed(4)),
          total_cost: Number((aiCost + cloudCost).toFixed(4)),
        };
      });

      const totalsRaw = result.totals || {};
      const totalTokens = Number(totalsRaw.total_tokens) || 0;
      const totalCalls = Number(totalsRaw.total_calls) || 0;
      const totalUsers = Number(totalsRaw.total_users) || 0;
      const totalAICost = (totalTokens / 1000) * COST_PER_1K_TOKENS;
      const totalCloudCost = totalCalls * CLOUD_COST_PER_CALL;
      const totalCost = totalAICost + totalCloudCost;

      setData({
        byEndpoint,
        byUser,
        daily,
        totals: {
          totalCalls,
          totalTokens,
          totalUsers,
          totalAICost,
          totalCloudCost,
          totalCost,
          avgCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
          avgCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
        },
      });
    } catch (err: any) {
      setError(err.message || "Erro ao buscar métricas de custo");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysBack]);

  return { data, isLoading, error, refetch: fetchData };
}
