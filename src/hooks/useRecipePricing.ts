import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecipePricingInput {
  recipe_name: string;
  ingredients: { ingredient_id: string; quantity: number; unit: string }[];
  servings: number;
  cmv_target: number;
  selling_price?: number | null;
  ifood_selling_price?: number | null;
  loss_percent?: number;
  discount_percent?: number;
  local_ifood_rate?: number | null;
  store_id?: string | null;
}

export interface RecipePricingResult {
  // Ingredients
  ingredients: { ingredient_id: string; quantity: number; unit: string; cost: number }[];

  // Core costs
  ingredients_cost_total: number;
  ingredients_cost_per_serving: number;
  cost_with_loss: number;
  loss_multiplier: number;

  // Pricing
  suggested_price: number;
  final_selling_price: number;
  selling_price_is_manual: boolean;

  // CMV
  cmv_target: number;
  actual_cmv: number;

  // Margins
  gross_margin: number;
  gross_margin_percent: number;

  // Promotion
  discount_percent: number;
  discounted_price: number;

  // iFood
  effective_ifood_rate: number;
  suggested_ifood_price: number;
  calculated_ifood_price: number;
  ifood_price: number;
  ifood_price_is_manual: boolean;

  // Net Profit - Loja
  production_costs_percent: number | null;
  tax_percentage: number;
  production_cost_value_loja: number;
  tax_value_loja: number;
  net_profit_loja: number;
  net_profit_loja_percent: number;

  // Net Profit - iFood
  ifood_fee_value: number;
  ifood_net_revenue: number;
  ifood_production_cost: number;
  ifood_tax_value: number;
  net_profit_ifood: number;
  net_profit_ifood_percent: number;

  // Warnings
  warnings: string[];
}

const DEBOUNCE_MS = 500;

export function useRecipePricing() {
  const [result, setResult] = useState<RecipePricingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<string>("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const calculate = useCallback((input: RecipePricingInput) => {
    // Skip if no valid ingredients
    const validIngredients = input.ingredients.filter(
      (i) => i.ingredient_id && i.quantity > 0
    );
    if (validIngredients.length === 0) {
      setResult(null);
      setError(null);
      setIsCalculating(false);
      return;
    }

    // Deduplicate: skip if same input
    const inputKey = JSON.stringify({ ...input, ingredients: validIngredients });
    if (inputKey === lastInputRef.current) return;

    setIsCalculating(true);
    setError(null);

    // Cancel previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        lastInputRef.current = inputKey;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Sessão expirada. Faça login novamente.");
          setIsCalculating(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-recipe-pricing`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              ...input,
              ingredients: validIngredients,
            }),
            signal: abortRef.current.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Erro ao calcular precificação.");
          setIsCalculating(false);
          return;
        }

        setResult(data as RecipePricingResult);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return; // Request was cancelled, ignore
        console.error("Recipe pricing error:", err);
        setError("Não foi possível calcular a precificação com os dados informados. Verifique seus custos e taxas.");
      } finally {
        setIsCalculating(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsCalculating(false);
    lastInputRef.current = "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return {
    result,
    isCalculating,
    error,
    calculate,
    reset,
  };
}
