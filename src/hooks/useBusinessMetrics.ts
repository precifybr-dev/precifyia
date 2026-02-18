import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessMetricsResult {
  // Production costs
  fixed_costs_total: number;
  variable_costs_total: number;
  production_costs_total: number;
  production_costs_percent: number | null;
  production_remaining_margin: number | null;

  // Business expenses
  fixed_expenses_total: number;
  variable_expenses_total: number;
  total_expenses: number;
  fixed_expenses_percent: number | null;
  variable_expenses_percent: number | null;
  total_expenses_percent: number | null;

  // Limit
  cost_limit_percent: number;
  is_over_limit: boolean;
  excess_percent: number;

  // Taxes & fees
  tax_percentage: number;
  average_card_fee: number;
  total_deductions: number;

  // DRE
  monthly_revenue: number | null;
  net_result: number | null;
  net_margin_percent: number | null;
  is_profit: boolean;
  profit_health_status: "critico" | "apertado" | "saudavel" | "acima_media" | null;

  // Warnings
  warnings: string[];
}

const DEBOUNCE_MS = 3000;
const MAX_429_RETRIES = 2;

export function useBusinessMetrics() {
  const [result, setResult] = useState<BusinessMetricsResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef(false);
  const lastStoreRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const calculate = useCallback((storeId?: string | null) => {
    const resolvedStoreId = storeId || null;
    lastStoreRef.current = resolvedStoreId;
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (inflightRef.current) {
        return; // Let the current request finish; the caller can re-invoke later
      }

      inflightRef.current = true;
      abortRef.current = new AbortController();
      setIsCalculating(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Sessão expirada. Faça login novamente.");
          setIsCalculating(false);
          inflightRef.current = false;
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-business-metrics`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ store_id: resolvedStoreId }),
            signal: abortRef.current.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 429) {
            retryCountRef.current += 1;
            if (retryCountRef.current <= MAX_429_RETRIES) {
              const retryAfter = Math.min(retryCountRef.current * 5000, 15000);
              inflightRef.current = false;
              setIsCalculating(false);
              debounceRef.current = setTimeout(() => calculate(lastStoreRef.current), retryAfter);
              return;
            }
            // Max retries exceeded — stop retrying
            setError("Servidor ocupado. Aguarde alguns segundos e recarregue a página.");
            setIsCalculating(false);
            inflightRef.current = false;
            return;
          }
          setError(data.error || "Erro ao calcular métricas do negócio.");
          setIsCalculating(false);
          inflightRef.current = false;
          return;
        }

        retryCountRef.current = 0; // Reset on success
        setResult(data as BusinessMetricsResult);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Business metrics error:", err);
        setError("Não foi possível calcular as métricas do negócio.");
      } finally {
        setIsCalculating(false);
        inflightRef.current = false;
      }
    }, DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsCalculating(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { result, isCalculating, error, calculate, reset };
}
