import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

export interface ComboItem {
  id?: string;
  item_name: string;
  item_type: string;
  role: string;
  is_bait: boolean;
  individual_price: number;
  cost: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  objective: string;
  status: string;
  individual_total_price: number;
  combo_price: number;
  combo_price_ifood: number;
  ingredients_description: string | null;
  total_cost: number;
  estimated_profit: number;
  margin_percent: number;
  strategy_explanation: string | null;
  created_at: string;
  items?: ComboItem[];
  is_simulation?: boolean;
}

export interface ComboUsage {
  used: number;
  limit: number | null;
  plan: string;
}

export interface AvailableItem {
  id: string;
  name: string;
  type: "recipe" | "beverage";
  price: number;
  cost: number;
  category?: string;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  ticket_medio: "Aumentar ticket médio",
  conversao_ifood: "Melhorar conversão iFood",
  produto_ancora: "Criar produto âncora",
  girar_estoque: "Girar estoque",
  dias_fracos: "Vender mais em dias fracos",
  combo_familia: "Criar combo família",
  teste_estrategico: "Teste estratégico",
  percepcao_vantagem: "Criar percepção de vantagem",
  teste_rapido: "Teste rápido",
};

export function useCombos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [usageLimit, setUsageLimit] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState("free");
  const [availableRecipes, setAvailableRecipes] = useState<AvailableItem[]>([]);
  const [availableBeverages, setAvailableBeverages] = useState<AvailableItem[]>([]);
  const { toast } = useToast();
  const { activeStore } = useStore();

  const fetchCombos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let combosQuery = supabase
        .from("combos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (activeStore?.id) {
        combosQuery = combosQuery.eq("store_id", activeStore.id);
      }

      const { data, error } = await combosQuery;

      if (!error && data) {
        const comboIds = data.map((c: any) => c.id);
        let itemsByCombo: Record<string, ComboItem[]> = {};

        if (comboIds.length > 0) {
          const { data: items } = await supabase
            .from("combo_items")
            .select("*")
            .in("combo_id", comboIds);

          if (items) {
            for (const item of items) {
              const cid = (item as any).combo_id;
              if (!itemsByCombo[cid]) itemsByCombo[cid] = [];
              itemsByCombo[cid].push(item as unknown as ComboItem);
            }
          }
        }

        const combosWithItems = data.map((c: any) => ({
          ...c,
          items: itemsByCombo[c.id] || [],
        }));

        setCombos(combosWithItems as Combo[]);
      }

      // Fetch available items for manual selection
      const [recipesRes, beveragesRes] = await Promise.all([
        supabase.from("recipes")
          .select("id, name, total_cost, cost_per_serving, selling_price, suggested_price")
          .eq("user_id", user.id),
        supabase.from("beverages")
          .select("id, name, purchase_price, selling_price, category")
          .eq("user_id", user.id),
      ]);

      if (recipesRes.data) {
        setAvailableRecipes(recipesRes.data.map(r => ({
          id: r.id,
          name: r.name,
          type: "recipe" as const,
          price: r.selling_price || r.suggested_price || 0,
          cost: r.cost_per_serving || r.total_cost || 0,
        })));
      }

      if (beveragesRes.data) {
        setAvailableBeverages(beveragesRes.data.map(b => ({
          id: b.id,
          name: b.name,
          type: "beverage" as const,
          price: b.selling_price || 0,
          cost: b.purchase_price || 0,
          category: b.category || undefined,
        })));
      }

      // Get usage this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let usageQuery = supabase
        .from("combo_generation_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if (activeStore?.id) {
        usageQuery = usageQuery.eq("store_id", activeStore.id);
      }

      const { count } = await usageQuery;
      setMonthlyUsage(count ?? 0);

      // Get plan limits
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      const plan = profile?.user_plan || "free";
      setUserPlan(plan);

      const { data: feature } = await supabase
        .from("plan_features")
        .select("usage_limit")
        .eq("plan", plan)
        .eq("feature", "combos_ai")
        .maybeSingle();

      setUsageLimit(feature?.usage_limit ?? null);
    } catch (err) {
      console.error("Error fetching combos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    fetchCombos();
  }, [fetchCombos]);

  const generateCombo = useCallback(async (objective: string, selectedItemIds?: string[]): Promise<Combo | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-combo", {
        body: { objective, storeId: activeStore?.id, selectedItemIds },
      });

      if (error) {
        let errorMessage = "Erro ao gerar combo";
        try {
          const errBody = typeof error === "object" && error.message ? error.message : String(error);
          errorMessage = errBody;
        } catch {}
        toast({ title: "Erro", description: errorMessage, variant: "destructive" });
        return null;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }

      const combo = data.combo as Combo;
      const usage = data.usage as ComboUsage;

      setMonthlyUsage(usage.used);
      setCombos((prev) => [combo, ...prev]);

      toast({ title: "Combo gerado! ✨", description: `"${combo.name}" foi criado com sucesso.` });
      return combo;
    } catch (err) {
      console.error("Error generating combo:", err);
      toast({ title: "Erro", description: "Erro inesperado ao gerar combo.", variant: "destructive" });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [activeStore?.id, toast]);

  const generateMenuStrategy = useCallback(async (strategyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-menu-strategy", {
        body: { strategyId, storeId: activeStore?.id },
      });

      if (error) {
        toast({ title: "Erro", description: "Erro ao gerar estratégia", variant: "destructive" });
        return null;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }

      const usage = data.usage;
      setMonthlyUsage(usage.used);

      toast({ title: "Estratégia gerada! 🎯", description: "Confira a organização sugerida para seu cardápio." });
      return data.strategy;
    } catch (err) {
      console.error("Error generating strategy:", err);
      toast({ title: "Erro", description: "Erro inesperado.", variant: "destructive" });
      return null;
    }
  }, [activeStore?.id, toast]);

  const deleteCombo = useCallback(async (comboId: string) => {
    const { error } = await supabase.from("combos").delete().eq("id", comboId);
    if (!error) {
      setCombos((prev) => prev.filter((c) => c.id !== comboId));
      toast({ title: "Combo excluído" });
    }
  }, [toast]);

  const canGenerate = usageLimit === null || monthlyUsage < usageLimit;
  const isFree = userPlan === "free";

  return {
    combos,
    isLoading,
    isGenerating,
    monthlyUsage,
    usageLimit,
    userPlan,
    canGenerate,
    isFree,
    availableRecipes,
    availableBeverages,
    generateCombo,
    generateMenuStrategy,
    deleteCombo,
    refresh: fetchCombos,
    objectiveLabels: OBJECTIVE_LABELS,
  };
}
