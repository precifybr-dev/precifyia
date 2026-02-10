import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IfoodFeesInput {
  plan_type: string | null;
  base_rate: number | null;
  anticipation_type: string;
  monthly_orders: number | null;
  average_ticket: number | null;
  offers_coupon: boolean;
  orders_with_coupon: number | null;
  coupon_value: number | null;
  coupon_type: string;
  coupon_absorber: string;
  has_delivery_fee: boolean;
  delivery_fee: number | null;
  delivery_absorber: string;
}

export interface IfoodFeesResult {
  real_percentage: number | null;
  base_rate_real: number | null;
  anticipation_fee: number;
  monthly_revenue: number;
  coupon_monthly_cost: number;
  coupon_impact_percent: number;
  delivery_monthly_cost: number;
  delivery_impact_percent: number;
  warnings: string[];
}

const DEBOUNCE_MS = 500;

export function useIfoodFees() {
  const [result, setResult] = useState<IfoodFeesResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const calculate = useCallback((input: IfoodFeesInput) => {
    const inputKey = JSON.stringify(input);
    if (inputKey === lastInputRef.current) return;

    setIsCalculating(true);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
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
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-ifood-fees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(input),
            signal: abortRef.current.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Erro ao calcular taxas do iFood.");
          setIsCalculating(false);
          return;
        }

        setResult(data as IfoodFeesResult);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("iFood fees error:", err);
        setError("Não foi possível calcular as taxas do iFood.");
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

  return { result, isCalculating, error, calculate, reset };
}
