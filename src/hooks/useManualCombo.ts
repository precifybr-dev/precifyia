import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

export interface ManualComboItem {
  id: string;
  name: string;
  type: "recipe" | "beverage";
  price: number;        // selling price
  cost: number;         // total cost
  quantity: number;
  category?: string;
  margin: number;       // individual margin %
  ingredients?: string[];
}

export interface ComboStrategy {
  id: string;
  label: string;
  description: string;
  discountFactor: number;   // multiplier for suggested price
  marginFloor: number;      // minimum margin % for this strategy
}

export interface ComboAlert {
  type: "danger" | "warning" | "info";
  message: string;
}

export interface ItemRole {
  item: ManualComboItem;
  role: "principal" | "complementar" | "isca" | "sustentacao";
  confidence: "alta" | "media" | "baixa";
  reason: string;
}

export interface ComboAnalysis {
  baitItem: ManualComboItem | null;
  profitDriver: ManualComboItem | null;
  costLeader: ManualComboItem | null;
  itemRoles: ItemRole[];
  isBalanced: boolean;
  alerts: ComboAlert[];
}

export interface ManualComboResult {
  items: ManualComboItem[];
  totalAvulso: number;
  totalCost: number;
  grossProfitAvulso: number;
  marginAvulso: number;
  minPriceNoLoss: number;
  minPriceWithSafetyMargin: number;
  safePriceSuggestion: number;
  aggressivePriceSuggestion: number;
  clientSavings: number;
  clientSavingsPercent: number;
  estimatedProfit: number;
  estimatedMargin: number;
  ifoodPrice: number;
  ifoodRate: number;
  analysis: ComboAnalysis;
}

export interface GeneratedComboDetails {
  name: string;
  description: string;
  ingredientsDescription: string;
  discountItemExplanation: string;
  profitItemExplanation: string;
  strategyExplanation: string;
}

const STRATEGIES: ComboStrategy[] = [
  { id: "ticket_medio", label: "Aumentar ticket médio", description: "Desconto menor, margem melhor. Foco em pedidos maiores.", discountFactor: 0.90, marginFloor: 25 },
  { id: "percepcao_vantagem", label: "Criar percepção de vantagem", description: "Desconto mais visível, economia clara para o cliente.", discountFactor: 0.82, marginFloor: 18 },
  { id: "dias_fracos", label: "Vender mais em dias fracos", description: "Preço mais agressivo, mas sem prejuízo.", discountFactor: 0.75, marginFloor: 12 },
  { id: "combo_familia", label: "Criar combo família", description: "Foco em volume e conveniência.", discountFactor: 0.80, marginFloor: 15 },
  { id: "item_isca", label: "Atrair com item isca", description: "Um item sai barato para atrair, os outros sustentam.", discountFactor: 0.78, marginFloor: 15 },
  { id: "promo_controlada", label: "Promoção controlada", description: "Desconto planejado com margem garantida.", discountFactor: 0.85, marginFloor: 20 },
];

export function useManualCombo() {
  const [selectedItems, setSelectedItems] = useState<ManualComboItem[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generatedDetails, setGeneratedDetails] = useState<GeneratedComboDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { activeStore } = useStore();

  const strategy = useMemo(() => STRATEGIES.find(s => s.id === selectedStrategy), [selectedStrategy]);

  const addItem = useCallback((item: Omit<ManualComboItem, "quantity" | "margin" | "ingredients">, ingredients?: string[]) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const margin = item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
      return [...prev, { ...item, quantity: 1, margin, ingredients }];
    });
    setGeneratedDetails(null);
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
    setGeneratedDetails(null);
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    setGeneratedDetails(null);
  }, []);

  const result = useMemo<ManualComboResult | null>(() => {
    if (selectedItems.length === 0) return null;

    const totalAvulso = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalCost = selectedItems.reduce((sum, i) => sum + i.cost * i.quantity, 0);
    const minPriceNoLoss = totalCost;
    const grossProfitAvulso = totalAvulso - totalCost;
    const marginAvulso = totalAvulso > 0 ? (grossProfitAvulso / totalAvulso) * 100 : 0;

    const discountFactor = strategy?.discountFactor ?? 0.85;
    const marginFloor = strategy?.marginFloor ?? 20;

    // Min price with safety margin
    const minPriceWithSafetyMargin = totalCost / (1 - marginFloor / 100);

    // Safe: good margin
    const safeFromMargin = minPriceWithSafetyMargin;
    const safeFromDiscount = totalAvulso * discountFactor;
    const safePriceSuggestion = Math.max(safeFromMargin, Math.min(safeFromDiscount, totalAvulso * 0.95));

    // Aggressive: lower margin but still positive
    const aggressiveMarginFloor = Math.max(marginFloor - 8, 8);
    const aggressiveFromMargin = totalCost / (1 - aggressiveMarginFloor / 100);
    const aggressiveFromDiscount = totalAvulso * (discountFactor - 0.08);
    const aggressivePriceSuggestion = Math.max(aggressiveFromMargin, Math.min(aggressiveFromDiscount, totalAvulso * 0.85));

    const clientSavings = totalAvulso - safePriceSuggestion;
    const clientSavingsPercent = totalAvulso > 0 ? (clientSavings / totalAvulso) * 100 : 0;
    const estimatedProfit = safePriceSuggestion - totalCost;
    const estimatedMargin = safePriceSuggestion > 0 ? (estimatedProfit / safePriceSuggestion) * 100 : 0;

    // Strategic analysis
    const sorted = [...selectedItems].sort((a, b) => a.margin - b.margin);
    const baitItem = sorted[0] || null;
    const profitDriver = sorted[sorted.length - 1] || null;
    const costLeader = [...selectedItems].sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity))[0] || null;

    // 4-role classification
    const itemRoles: ItemRole[] = classifyItemRoles(selectedItems);

    const alerts: ComboAlert[] = [];

    if (estimatedMargin < 10) {
      alerts.push({ type: "danger", message: "Margem muito baixa! O combo está perto do prejuízo." });
    } else if (estimatedMargin < 18) {
      alerts.push({ type: "warning", message: "Margem abaixo do ideal. Considere ajustar os itens ou o preço." });
    }

    if (safePriceSuggestion <= totalCost * 1.05) {
      alerts.push({ type: "danger", message: "Preço final muito próximo do custo. Risco de prejuízo com qualquer variação." });
    }

    const allDiscounted = selectedItems.every(i => i.margin < 20);
    if (allDiscounted && selectedItems.length > 1) {
      alerts.push({ type: "warning", message: "Todos os itens têm margem baixa. Falta um item sustentando o lucro." });
    }

    if (clientSavingsPercent < 5 && selectedItems.length > 1) {
      alerts.push({ type: "info", message: "Percepção de economia fraca. O cliente pode não ver vantagem no combo." });
    }

    if (clientSavingsPercent > 35) {
      alerts.push({ type: "warning", message: "Desconto excessivo! Verifique se a margem está realmente segura." });
    }

    const isBalanced = estimatedMargin >= 15 && clientSavingsPercent >= 8 && clientSavingsPercent <= 30;

    return {
      items: selectedItems,
      totalAvulso: round(totalAvulso),
      totalCost: round(totalCost),
      grossProfitAvulso: round(grossProfitAvulso),
      marginAvulso: round(marginAvulso),
      minPriceNoLoss: round(minPriceNoLoss),
      minPriceWithSafetyMargin: round(minPriceWithSafetyMargin),
      safePriceSuggestion: round(safePriceSuggestion),
      aggressivePriceSuggestion: round(aggressivePriceSuggestion),
      clientSavings: round(clientSavings),
      clientSavingsPercent: round(clientSavingsPercent),
      estimatedProfit: round(estimatedProfit),
      estimatedMargin: round(estimatedMargin),
      analysis: { baitItem, profitDriver, costLeader, itemRoles, isBalanced, alerts },
    };
  }, [selectedItems, strategy]);

  const generateDetails = useCallback(async () => {
    if (!result || selectedItems.length === 0 || !selectedStrategy) return;
    setIsGeneratingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-combo-details", {
        body: {
          items: selectedItems.map(i => ({
            name: i.name,
            type: i.type,
            quantity: i.quantity,
            price: i.price,
            cost: i.cost,
            margin: i.margin,
            ingredients: i.ingredients || [],
          })),
          strategy: selectedStrategy,
          totalAvulso: result.totalAvulso,
          totalCost: result.totalCost,
          minPriceNoLoss: result.minPriceNoLoss,
          suggestedPrice: result.safePriceSuggestion,
          aggressivePrice: result.aggressivePriceSuggestion,
          savings: result.clientSavings,
          savingsPercent: result.clientSavingsPercent,
          estimatedProfit: result.estimatedProfit,
          estimatedMargin: result.estimatedMargin,
          baitItemName: result.analysis.baitItem?.name || null,
          profitDriverName: result.analysis.profitDriver?.name || null,
        },
      });

      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Erro ao gerar nome e descrição.", variant: "destructive" });
        return;
      }

      setGeneratedDetails({
        name: data.name,
        description: data.description,
        ingredientsDescription: data.ingredientsDescription,
        discountItemExplanation: data.discountItemExplanation || "",
        profitItemExplanation: data.profitItemExplanation || "",
        strategyExplanation: data.strategyExplanation || "",
      });
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao gerar detalhes.", variant: "destructive" });
    } finally {
      setIsGeneratingDetails(false);
    }
  }, [result, selectedItems, selectedStrategy, toast]);

  const saveCombo = useCallback(async () => {
    if (!result || !generatedDetails) return false;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const comboPrice = result.safePriceSuggestion;
      const profit = comboPrice - result.totalCost;
      const margin = comboPrice > 0 ? (profit / comboPrice) * 100 : 0;

      const { data: savedCombo, error: saveError } = await supabase
        .from("combos")
        .insert({
          user_id: user.id,
          store_id: activeStore?.id || null,
          name: generatedDetails.name,
          description: generatedDetails.description,
          objective: selectedStrategy || "manual",
          status: "draft",
          individual_total_price: result.totalAvulso,
          combo_price: round(comboPrice),
          combo_price_ifood: 0,
          ingredients_description: generatedDetails.ingredientsDescription,
          total_cost: result.totalCost,
          estimated_profit: round(profit),
          margin_percent: round(margin),
          strategy_explanation: generatedDetails.strategyExplanation || `Combo manual com estratégia "${STRATEGIES.find(s => s.id === selectedStrategy)?.label}". Economia de ${result.clientSavingsPercent.toFixed(0)}% para o cliente.`,
        })
        .select("id")
        .single();

      if (saveError) throw saveError;

      // Save items
      const itemsToInsert = selectedItems.map(item => ({
        combo_id: savedCombo.id,
        item_type: item.type,
        item_name: `${item.quantity}x ${item.name}`,
        individual_price: round(item.price * item.quantity),
        cost: round(item.cost * item.quantity),
        role: item.margin >= 25 ? "main" : item.type === "beverage" ? "beverage" : "accompaniment",
        is_bait: item === result.analysis.baitItem,
      }));

      await supabase.from("combo_items").insert(itemsToInsert);

      toast({ title: "Combo salvo! ✅", description: `"${generatedDetails.name}" foi criado com sucesso.` });
      return true;
    } catch (err) {
      console.error("Error saving manual combo:", err);
      toast({ title: "Erro", description: "Erro ao salvar combo.", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [result, generatedDetails, selectedItems, selectedStrategy, activeStore?.id, toast]);

  const reset = useCallback(() => {
    setSelectedItems([]);
    setSelectedStrategy(null);
    setGeneratedDetails(null);
  }, []);

  return {
    selectedItems,
    selectedStrategy,
    strategy,
    strategies: STRATEGIES,
    result,
    generatedDetails,
    isGeneratingDetails,
    isSaving,
    addItem,
    removeItem,
    updateQuantity,
    setSelectedStrategy,
    generateDetails,
    saveCombo,
    reset,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function classifyItemRoles(items: ManualComboItem[]): ItemRole[] {
  if (items.length === 0) return [];

  const avgMargin = items.reduce((s, i) => s + i.margin, 0) / items.length;
  const avgCost = items.reduce((s, i) => s + i.cost * i.quantity, 0) / items.length;
  const maxMargin = Math.max(...items.map(i => i.margin));
  const minMargin = Math.min(...items.map(i => i.margin));
  const marginSpread = maxMargin - minMargin;

  return items.map(item => {
    const itemTotalCost = item.cost * item.quantity;
    const itemTotalPrice = item.price * item.quantity;

    // Principal: highest cost contribution AND decent margin
    if (itemTotalCost >= avgCost * 1.3 && item.margin >= avgMargin * 0.8) {
      return {
        item,
        role: "principal" as const,
        confidence: itemTotalCost >= avgCost * 1.8 ? "alta" as const : "media" as const,
        reason: `Maior peso no combo (${((itemTotalCost / items.reduce((s, i) => s + i.cost * i.quantity, 0)) * 100).toFixed(0)}% do custo)`,
      };
    }

    // Sustentação: highest margin item
    if (item.margin >= avgMargin * 1.3 && item.margin >= 25) {
      return {
        item,
        role: "sustentacao" as const,
        confidence: marginSpread > 15 ? "alta" as const : "media" as const,
        reason: `Margem de ${item.margin.toFixed(0)}% sustenta a rentabilidade`,
      };
    }

    // Isca: lowest margin, attracts customer
    if (item.margin <= avgMargin * 0.7 && item.margin < 20) {
      return {
        item,
        role: "isca" as const,
        confidence: item.margin < 10 ? "alta" as const : "media" as const,
        reason: `Margem baixa (${item.margin.toFixed(0)}%) atrai o cliente pelo preço`,
      };
    }

    // Complementar: everything else
    return {
      item,
      role: "complementar" as const,
      confidence: (marginSpread < 10 ? "baixa" : "media") as "alta" | "media" | "baixa",
      reason: items.length <= 2
        ? "Poucos itens para classificar com segurança"
        : `Complementa o combo com margem de ${item.margin.toFixed(0)}%`,
    };
  });
}
