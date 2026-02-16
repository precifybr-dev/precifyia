import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";
import type { MenuAnalysis } from "@/components/menu-mirror/MenuPerformanceDashboard";

export interface FullMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  position: number;
}

export interface MenuMirrorData {
  storeName: string;
  items: FullMenuItem[];
}

export interface AnalysisUsage {
  used: number;
  limit: number;
  plan: string;
}

export function useMenuMirror() {
  const { activeStore, refreshStores } = useStore();
  const { toast } = useToast();
  const [menuData, setMenuData] = useState<MenuMirrorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLoadedFromCache, setAnalysisLoadedFromCache] = useState(false);
  const [analysisUsage, setAnalysisUsage] = useState<AnalysisUsage | null>(null);

  const ifoodUrl = activeStore?.ifood_url ?? null;

  // Fetch analysis usage credits
  const fetchAnalysisUsage = useCallback(async () => {
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

      // Get plan limit
      const { data: planFeature } = await supabase
        .from("plan_features")
        .select("usage_limit")
        .eq("plan", plan)
        .eq("feature", "analyze-menu-performance")
        .maybeSingle();

      const limit = planFeature?.usage_limit ?? (plan === "free" ? 1 : plan === "basic" ? 5 : 10);

      // Count usage - free = all-time, paid = monthly
      let query = supabase
        .from("strategic_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("endpoint", "analyze-menu-performance");

      if (plan !== "free") {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        query = query.gte("created_at", monthStart.toISOString());
      }

      const { count } = await query;
      setAnalysisUsage({ used: count || 0, limit, plan });
    } catch {
      // Non-critical
    }
  }, []);

  // Load saved analysis from database on mount
  const loadAnalysisFromCache = useCallback(async () => {
    if (!activeStore?.id || analysisLoadedFromCache) return;
    try {
      const { data } = await supabase
        .from("stores")
        .select("menu_analysis, menu_analysis_at")
        .eq("id", activeStore.id)
        .single();

      const saved = (data as any)?.menu_analysis;
      if (saved && saved.totalScore !== undefined) {
        setAnalysis(saved);
      }
    } catch {
      // Not critical
    } finally {
      setAnalysisLoadedFromCache(true);
    }
  }, [activeStore?.id, analysisLoadedFromCache]);

  // Load menu from database cache (no Edge Function call)
  const loadFromCache = useCallback(async () => {
    if (!activeStore?.id) return false;

    try {
      const { data, error } = await supabase
        .from("stores")
        .select("menu_cache, menu_cached_at")
        .eq("id", activeStore.id)
        .single();

      if (error || !data) return false;

      const cache = (data as any).menu_cache;
      if (cache && cache.items && cache.items.length > 0) {
        setMenuData({
          storeName: cache.storeName || "Minha Loja",
          items: cache.items,
        });
        return true;
      }
    } catch {
      // Cache miss, not an error
    }
    return false;
  }, [activeStore?.id]);

  // Fetch fresh menu from Edge Function (direct JSON extraction, no AI)
  const fetchMenu = useCallback(async (url?: string, forceRefresh = false) => {
    const targetUrl = url || ifoodUrl;
    if (!targetUrl) return;

    // Try cache first unless forcing refresh
    if (!forceRefresh && !url) {
      const cached = await loadFromCache();
      if (cached) return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-ifood-menu", {
        body: {
          ifoodUrl: targetUrl,
          importType: "full_menu",
          storeId: activeStore?.id,
          forceRefresh: forceRefresh,
        },
      });

      if (error) throw error;

      if (data?.success && data.items) {
        setMenuData({
          storeName: data.storeName || "Minha Loja",
          items: data.items,
        });

        // Inform user if data is stale (from expired cache fallback)
        if (data.stale) {
          toast({
            title: "Cardápio pode estar desatualizado",
            description: "Não foi possível atualizar agora. Mostrando última versão salva.",
          });
        }
      } else {
        throw new Error(data?.error || "Erro ao buscar cardápio");
      }
    } catch (err: any) {
      console.error("fetchMenu error:", err);
      toast({
        title: "Erro ao carregar cardápio",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [ifoodUrl, activeStore?.id, loadFromCache, toast]);

  const saveIfoodUrl = useCallback(async (url: string) => {
    if (!activeStore?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ ifood_url: url, menu_cache: null, menu_cached_at: null } as any)
        .eq("id", activeStore.id);

      if (error) throw error;

      await refreshStores();

      toast({
        title: "Link salvo!",
        description: "Seu cardápio será carregado automaticamente.",
      });

      // Force fresh fetch when saving new URL
      await fetchMenu(url, true);
    } catch (err: any) {
      console.error("saveIfoodUrl error:", err);
      toast({
        title: "Erro ao salvar link",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeStore?.id, fetchMenu, toast]);

  const clearUrl = useCallback(async () => {
    if (!activeStore?.id) return;

    try {
      await supabase
        .from("stores")
        .update({ ifood_url: null, menu_cache: null, menu_cached_at: null } as any)
        .eq("id", activeStore.id);

      await refreshStores();
      setMenuData(null);
      toast({ title: "Link removido" });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [activeStore?.id, toast]);

  const analyzeMenu = useCallback(async () => {
    if (!menuData || menuData.items.length === 0) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-menu-performance", {
        body: { items: menuData.items, storeName: menuData.storeName },
      });

      if (error) throw error;

      if (data?.upgrade_required) {
        toast({
          title: "Limite atingido",
          description: data.error || "Faça upgrade para continuar analisando seu cardápio.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data.analysis) {
        setAnalysis(data.analysis);

        // Persist analysis to database
        if (activeStore?.id) {
          await supabase
            .from("stores")
            .update({ menu_analysis: data.analysis, menu_analysis_at: new Date().toISOString() } as any)
            .eq("id", activeStore.id);
        }

        // Refresh usage after successful analysis
        await fetchAnalysisUsage();
      } else {
        throw new Error(data?.error || "Erro ao analisar cardápio");
      }
    } catch (err: any) {
      console.error("analyzeMenu error:", err);
      toast({
        title: "Erro na análise",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [menuData, activeStore?.id, toast]);

  return {
    menuData,
    isLoading,
    isSaving,
    ifoodUrl,
    fetchMenu,
    saveIfoodUrl,
    clearUrl,
    analysis,
    isAnalyzing,
    analyzeMenu,
    loadFromCache,
    loadAnalysisFromCache,
    analysisUsage,
    fetchAnalysisUsage,
  };
}
