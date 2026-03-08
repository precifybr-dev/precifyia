import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

export interface ComboMemoryData {
  produtosFrequentes: Record<string, number>; // item_name -> count
  estrategiasUsadas: Record<string, number>;  // strategy_id -> count
  ultimoObjetivo: string | null;
  margemMedia: number;
  faixaPrecoMin: number;
  faixaPrecoMax: number;
  totalCombosCriados: number;
  padroesMontagem: MontagePattern[];
}

export interface MontagePattern {
  items: string[];       // item names
  strategy: string;
  count: number;
  lastUsed: string;
}

const EMPTY_MEMORY: ComboMemoryData = {
  produtosFrequentes: {},
  estrategiasUsadas: {},
  ultimoObjetivo: null,
  margemMedia: 0,
  faixaPrecoMin: 0,
  faixaPrecoMax: 0,
  totalCombosCriados: 0,
  padroesMontagem: [],
};

export function useComboMemory() {
  const [memory, setMemory] = useState<ComboMemoryData>(EMPTY_MEMORY);
  const [isLoading, setIsLoading] = useState(true);
  const { activeStore } = useStore();

  // Load memory on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("combo_memory")
          .select("*")
          .eq("user_id", user.id);

        if (activeStore?.id) {
          query = query.eq("store_id", activeStore.id);
        } else {
          query = query.is("store_id", null);
        }

        const { data } = await query.maybeSingle();

        if (data) {
          setMemory({
            produtosFrequentes: (data.produtos_frequentes as Record<string, number>) || {},
            estrategiasUsadas: (data.estrategias_usadas as Record<string, number>) || {},
            ultimoObjetivo: data.ultimo_objetivo,
            margemMedia: (data as any).margem_media || 0,
            faixaPrecoMin: (data as any).faixa_preco_min || 0,
            faixaPrecoMax: (data as any).faixa_preco_max || 0,
            totalCombosCriados: (data as any).total_combos_criados || 0,
            padroesMontagem: ((data as any).padroes_montagem as MontagePattern[]) || [],
          });
        }
      } catch (err) {
        console.error("Error loading combo memory:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [activeStore?.id]);

  /**
   * Update memory after a combo is saved.
   */
  const recordComboSaved = useCallback(async (params: {
    itemNames: string[];
    strategyId: string;
    comboPrice: number;
    margin: number;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build updated memory
      const updatedProducts = { ...memory.produtosFrequentes };
      params.itemNames.forEach(name => {
        updatedProducts[name] = (updatedProducts[name] || 0) + 1;
      });

      const updatedStrategies = { ...memory.estrategiasUsadas };
      updatedStrategies[params.strategyId] = (updatedStrategies[params.strategyId] || 0) + 1;

      const newTotal = memory.totalCombosCriados + 1;
      const newMargemMedia = memory.totalCombosCriados > 0
        ? (memory.margemMedia * memory.totalCombosCriados + params.margin) / newTotal
        : params.margin;

      const newFaixaMin = memory.faixaPrecoMin === 0
        ? params.comboPrice
        : Math.min(memory.faixaPrecoMin, params.comboPrice);
      const newFaixaMax = Math.max(memory.faixaPrecoMax, params.comboPrice);

      // Update montage patterns (keep top 10)
      const patternKey = params.itemNames.sort().join("|");
      const updatedPatterns = [...memory.padroesMontagem];
      const existingIdx = updatedPatterns.findIndex(
        p => p.items.sort().join("|") === patternKey
      );
      if (existingIdx >= 0) {
        updatedPatterns[existingIdx].count += 1;
        updatedPatterns[existingIdx].lastUsed = new Date().toISOString();
        updatedPatterns[existingIdx].strategy = params.strategyId;
      } else {
        updatedPatterns.push({
          items: params.itemNames,
          strategy: params.strategyId,
          count: 1,
          lastUsed: new Date().toISOString(),
        });
      }
      // Keep only top 10 by count
      updatedPatterns.sort((a, b) => b.count - a.count);
      const trimmedPatterns = updatedPatterns.slice(0, 10);

      const upsertData = {
        user_id: user.id,
        store_id: activeStore?.id || null,
        produtos_frequentes: updatedProducts,
        estrategias_usadas: updatedStrategies,
        ultimo_objetivo: params.strategyId,
        margem_media: Math.round(newMargemMedia * 100) / 100,
        faixa_preco_min: Math.round(newFaixaMin * 100) / 100,
        faixa_preco_max: Math.round(newFaixaMax * 100) / 100,
        total_combos_criados: newTotal,
        padroes_montagem: trimmedPatterns,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("combo_memory")
        .upsert(upsertData as any, {
          onConflict: "user_id,store_id",
        });

      if (error) {
        console.error("Error updating combo memory:", error);
        return;
      }

      // Update local state
      setMemory({
        produtosFrequentes: updatedProducts,
        estrategiasUsadas: updatedStrategies,
        ultimoObjetivo: params.strategyId,
        margemMedia: Math.round(newMargemMedia * 100) / 100,
        faixaPrecoMin: newFaixaMin,
        faixaPrecoMax: newFaixaMax,
        totalCombosCriados: newTotal,
        padroesMontagem: trimmedPatterns,
      });
    } catch (err) {
      console.error("Error recording combo memory:", err);
    }
  }, [memory, activeStore?.id]);

  // Derived helpers
  const getTopItems = useCallback((limit = 5): string[] => {
    return Object.entries(memory.produtosFrequentes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
  }, [memory.produtosFrequentes]);

  const getMostUsedStrategy = useCallback((): string | null => {
    const entries = Object.entries(memory.estrategiasUsadas);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [memory.estrategiasUsadas]);

  const isFrequentItem = useCallback((itemName: string): boolean => {
    return (memory.produtosFrequentes[itemName] || 0) >= 2;
  }, [memory.produtosFrequentes]);

  return {
    memory,
    isLoading,
    recordComboSaved,
    getTopItems,
    getMostUsedStrategy,
    isFrequentItem,
    hasMemory: memory.totalCombosCriados > 0,
  };
}
