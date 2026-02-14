import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ControllershipMetrics {
  total_paying_clients: number;
  new_clients_month: number;
  cancelled_clients_month: number;
  total_marketing_investment: number;
  total_leads: number;
  total_impressions: number;
  total_clicks: number;
  mrr: number;
  arr_projected: number;
  average_ticket: number;
  cac: number;
  cpl: number;
  ctr: number;
  ltv: number;
  ltv_cac_ratio: number;
  payback_months: number;
  net_margin_per_client: number;
  churn_rate: number;
  monthly_growth_rate: number;
  net_revenue: number;
}

export interface MarketingMonthlyData {
  id: string;
  month: number;
  year: number;
  total_investment: number;
  impressions: number;
  clicks: number;
  leads_captured: number;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  platform: string;
  campaign_external_id: string | null;
  creative_id: string | null;
  monthly_budget: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ControllershipConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string | null;
}

export function useControllershipData() {
  const [metrics, setMetrics] = useState<ControllershipMetrics | null>(null);
  const [marketingData, setMarketingData] = useState<MarketingMonthlyData[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [config, setConfig] = useState<ControllershipConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchMetrics = useCallback(async (month?: number, year?: number) => {
    try {
      const { data, error } = await supabase.rpc("get_controllership_metrics", {
        p_month: month || selectedMonth,
        p_year: year || selectedYear,
      });
      if (error) throw error;
      if (data && data.length > 0) setMetrics(data[0] as unknown as ControllershipMetrics);
    } catch (err: any) {
      console.error("Error fetching controllership metrics:", err);
      setError(err.message);
    }
  }, [selectedMonth, selectedYear]);

  const fetchMarketingData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_monthly_data")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24);
      if (error) throw error;
      setMarketingData((data || []) as unknown as MarketingMonthlyData[]);
    } catch (err: any) {
      console.error("Error fetching marketing data:", err);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setCampaigns((data || []) as unknown as MarketingCampaign[]);
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("controllership_config")
        .select("*")
        .order("config_key");
      if (error) throw error;
      setConfig((data || []) as unknown as ControllershipConfig[]);
    } catch (err: any) {
      console.error("Error fetching config:", err);
    }
  }, []);

  const saveMarketingData = useCallback(async (input: {
    month: number; year: number; total_investment: number;
    impressions: number; clicks: number; leads_captured: number;
    source: string; notes?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("marketing_monthly_data").upsert({
        ...input,
        created_by: session.user.id,
      } as any, { onConflict: "month,year,source" });
      if (error) throw error;
      await fetchMarketingData();
      await fetchMetrics(input.month, input.year);
      return true;
    } catch (err: any) {
      console.error("Error saving marketing data:", err);
      setError(err.message);
      return false;
    }
  }, [fetchMarketingData, fetchMetrics]);

  const saveCampaign = useCallback(async (input: {
    name: string; platform: string; monthly_budget: number;
    campaign_external_id?: string; creative_id?: string;
    start_date?: string; end_date?: string; notes?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("marketing_campaigns").insert({
        ...input,
        created_by: session.user.id,
      } as any);
      if (error) throw error;
      await fetchCampaigns();
      return true;
    } catch (err: any) {
      console.error("Error saving campaign:", err);
      setError(err.message);
      return false;
    }
  }, [fetchCampaigns]);

  const updateConfig = useCallback(async (key: string, value: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("controllership_config")
        .update({ config_value: value, updated_by: session.user.id } as any)
        .eq("config_key", key);
      if (error) throw error;
      await fetchConfig();
      await fetchMetrics();
      return true;
    } catch (err: any) {
      console.error("Error updating config:", err);
      return false;
    }
  }, [fetchConfig, fetchMetrics]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchMetrics(), fetchMarketingData(), fetchCampaigns(), fetchConfig()]);
    setIsLoading(false);
  }, [fetchMetrics, fetchMarketingData, fetchCampaigns, fetchConfig]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return {
    metrics, marketingData, campaigns, config,
    isLoading, error,
    selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear,
    saveMarketingData, saveCampaign, updateConfig,
    refetch: loadAll, fetchMetrics,
  };
}
