import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const DEBOUNCE_MS = 5000;
const MAX_429_RETRIES = 2;

export function useBusinessMetrics() {
  const [result, setResult] = useState<BusinessMetricsResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingIn, setRetryingIn] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastStoreRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const clearRetryState = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRetryingIn(null);
  }, []);

  const calculate = useCallback((storeId?: string | null) => {
    const resolvedStoreId = storeId || null;
    const storeChanged = lastStoreRef.current !== null && lastStoreRef.current !== resolvedStoreId;
    lastStoreRef.current = resolvedStoreId;
    setError(null);
    clearRetryState();

    if (storeChanged) {
      setResult(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const delay = storeChanged ? 300 : DEBOUNCE_MS;

    debounceRef.current = setTimeout(async () => {
      // Deduplication: skip if a request is already in-flight
      if (inFlightRef.current) return;

      abortRef.current = new AbortController();
      inFlightRef.current = true;
      setIsCalculating(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Sessão expirada. Faça login novamente.");
          setIsCalculating(false);
          inFlightRef.current = false;
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

        if (lastStoreRef.current !== resolvedStoreId) {
          setIsCalculating(false);
          inFlightRef.current = false;
          return;
        }

        if (response.status === 429) {
          retryCountRef.current += 1;
          if (retryCountRef.current <= MAX_429_RETRIES) {
            // Read Retry-After header
            const retryAfterHeader = response.headers.get("Retry-After");
            let delaySec: number;

            if (retryAfterHeader) {
              const parsed = parseInt(retryAfterHeader, 10);
              delaySec = !isNaN(parsed) && parsed > 0 ? parsed : 5;
            } else {
              // Exponential backoff with jitter
              delaySec = Math.ceil(Math.pow(2, retryCountRef.current) + Math.random() * 2);
            }

            // Show countdown to user
            setRetryingIn(delaySec);
            setIsCalculating(false);
            inFlightRef.current = false;

            toast({
              title: "Aguarde um momento",
              description: `Servidor ocupado. Nova tentativa em ${delaySec}s...`,
            });

            // Countdown ticker
            countdownRef.current = setInterval(() => {
              setRetryingIn((prev) => {
                if (prev === null || prev <= 1) {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  return null;
                }
                return prev - 1;
              });
            }, 1000);

            // Schedule retry
            retryTimerRef.current = setTimeout(() => {
              clearRetryState();
              calculate(lastStoreRef.current);
            }, delaySec * 1000);
            return;
          }

          setError("Servidor ocupado. Aguarde alguns segundos e tente novamente.");
          setIsCalculating(false);
          inFlightRef.current = false;
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Erro ao calcular métricas do negócio.");
          setIsCalculating(false);
          inFlightRef.current = false;
          return;
        }

        retryCountRef.current = 0;
        setResult(data as BusinessMetricsResult);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Business metrics error:", err);
        setError("Não foi possível calcular as métricas do negócio.");
      } finally {
        setIsCalculating(false);
        inFlightRef.current = false;
      }
    }, delay);
  }, [toast, clearRetryState]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsCalculating(false);
    setRetryingIn(null);
    clearRetryState();
    retryCountRef.current = 0;
    inFlightRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, [clearRetryState]);

  return { result, isCalculating, error, retryingIn, calculate, reset };
}
