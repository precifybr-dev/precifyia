import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  real_price_monthly: number;
  anchored_price_monthly: number;
  real_price_yearly: number;
  anchored_price_yearly: number;
  yearly_discount_percent: number;
  features: { text: string; included: boolean }[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface AnchoringConfig {
  id: string;
  min_margin_percent: number;
  target_ltv_cac_ratio: number;
  min_ltv: number;
  psychological_discount_min: number;
  gateway_fee_percent: number;
  avg_retention_months: number;
  reinvestment_percent: number;
  avg_cac: number;
}

export interface PricingPhrase {
  id: string;
  phrase_template: string;
  is_active: boolean;
  sort_order: number;
}

export function useStrategicPricing() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<AnchoringConfig | null>(null);
  const [phrases, setPhrases] = useState<PricingPhrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, configRes, phrasesRes] = await Promise.all([
        supabase.from("pricing_plans").select("*").order("sort_order"),
        supabase.from("pricing_anchoring_config").select("*").limit(1).single(),
        supabase.from("pricing_phrases").select("*").order("sort_order"),
      ]);

      if (plansRes.data) {
        setPlans(plansRes.data.map(p => ({
          ...p,
          features: (p.features as any) || [],
        })));
      }
      if (configRes.data) setConfig(configRes.data as any);
      if (phrasesRes.data) setPhrases(phrasesRes.data as any);
    } catch (err) {
      console.error("Error fetching pricing data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const calculateAnchoring = (realPrice: number, psychologicalMin: number = 40) => {
    if (realPrice <= 0) return { anchoredPrice: 0, discountPercent: 0, yearlyPrice: 0, yearlyAnchored: 0 };
    const raw = realPrice / (1 - psychologicalMin / 100);
    // Round up to premium number (ending in 7)
    const anchoredPrice = Math.ceil(raw / 10) * 10 - 3;
    const discountPercent = Math.round(((anchoredPrice - realPrice) / anchoredPrice) * 100);
    const yearlyPrice = Math.round(realPrice * 12 * 0.8);
    const yearlyAnchored = Math.round(anchoredPrice * 12 * 0.8);
    return { anchoredPrice: Math.max(anchoredPrice, realPrice), discountPercent, yearlyPrice, yearlyAnchored };
  };

  const calculateMetrics = (realPrice: number, cfg: AnchoringConfig | null) => {
    if (!cfg || realPrice <= 0) return { ltv: 0, ltvCacRatio: 0, payback: 0, netRevenue: 0, monthlyProfit: 0, roi: 0 };
    const netRevenue = realPrice * (1 - cfg.gateway_fee_percent / 100);
    const ltv = netRevenue * cfg.avg_retention_months;
    const ltvCacRatio = cfg.avg_cac > 0 ? ltv / cfg.avg_cac : 0;
    const payback = netRevenue > 0 ? cfg.avg_cac / netRevenue : 0;
    const monthlyProfit = netRevenue - (cfg.avg_cac / cfg.avg_retention_months);
    const roi = cfg.avg_cac > 0 ? ((ltv - cfg.avg_cac) / cfg.avg_cac) * 100 : 0;
    return { ltv, ltvCacRatio, payback, netRevenue, monthlyProfit, roi };
  };

  const updatePlan = async (planId: string, updates: Partial<PricingPlan>, reason: string) => {
    const oldPlan = plans.find(p => p.id === planId);
    const { error } = await supabase.from("pricing_plans").update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq("id", planId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o plano.", variant: "destructive" });
      return false;
    }

    // Log audit
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("pricing_audit_log").insert({
        user_id: session.user.id,
        action: "update_plan",
        entity_type: "pricing_plan",
        entity_id: planId,
        old_value: oldPlan as any,
        new_value: updates as any,
        reason,
      });
    }

    toast({ title: "Plano atualizado", description: `${oldPlan?.name || planId} foi atualizado com sucesso.` });
    await fetchAll();
    return true;
  };

  const updateConfig = async (updates: Partial<AnchoringConfig>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase.from("pricing_anchoring_config").update({
      ...updates,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", config?.id || "");

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a configuração.", variant: "destructive" });
      return false;
    }

    await supabase.from("pricing_audit_log").insert({
      user_id: session.user.id,
      action: "update_config",
      entity_type: "anchoring_config",
      entity_id: config?.id || "",
      old_value: config as any,
      new_value: updates as any,
    });

    toast({ title: "Configuração salva" });
    await fetchAll();
    return true;
  };

  const updatePhrase = async (id: string, updates: Partial<PricingPhrase>) => {
    const { error } = await supabase.from("pricing_phrases").update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (!error) await fetchAll();
    return !error;
  };

  const addPhrase = async (template: string) => {
    const maxOrder = phrases.reduce((max, p) => Math.max(max, p.sort_order), -1);
    const { error } = await supabase.from("pricing_phrases").insert({
      phrase_template: template,
      sort_order: maxOrder + 1,
    });
    if (!error) await fetchAll();
    return !error;
  };

  const deletePhrase = async (id: string) => {
    const { error } = await supabase.from("pricing_phrases").delete().eq("id", id);
    if (!error) await fetchAll();
    return !error;
  };

  return {
    plans,
    config,
    phrases,
    isLoading,
    calculateAnchoring,
    calculateMetrics,
    updatePlan,
    updateConfig,
    updatePhrase,
    addPhrase,
    deletePhrase,
    refetch: fetchAll,
  };
}

// Lightweight hook for public pages (no admin features)
export function usePublicPricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [plansRes, phrasesRes] = await Promise.all([
        supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("pricing_phrases").select("phrase_template").eq("is_active", true).order("sort_order"),
      ]);
      if (plansRes.data) setPlans(plansRes.data.map(p => ({ ...p, features: (p.features as any) || [] })));
      if (phrasesRes.data) setPhrases(phrasesRes.data.map(p => p.phrase_template));
      setIsLoading(false);
    };
    fetch();
  }, []);

  return { plans, phrases, isLoading };
}
