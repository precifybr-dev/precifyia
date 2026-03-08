import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FullMenuItem } from "@/hooks/useMenuMirror";

export interface DeliveryInsightRule {
  id: string;
  insight_text: string;
  categoria: string;
  tipo_regra: string;
  valor_min: number | null;
  valor_max: number | null;
  descricao_regra: string;
  impacto: string;
  tags: string[];
  fonte: string | null;
}

export interface DiagnosticResult {
  problema_tipo: string;
  produto: string | null;
  nivel_risco: "alto" | "medio" | "baixo";
  explicacao: string;
  recomendacao: string;
}

const DEFAULT_CMV_ESTIMATE = 0.35;
const DEFAULT_MARKETPLACE_FEE = 0.27;

function evaluateItemRules(
  item: FullMenuItem,
  rules: DeliveryInsightRule[]
): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];
  const price = item.price;
  if (!price || price <= 0) return results;

  const cmvEstimado = price * DEFAULT_CMV_ESTIMATE;
  const taxaMarketplace = price * DEFAULT_MARKETPLACE_FEE;
  const lucroLiquido = price - cmvEstimado - taxaMarketplace;
  const margem = lucroLiquido / price;
  const cmvPercent = DEFAULT_CMV_ESTIMATE * 100;

  for (const rule of rules) {
    let triggered = false;

    if (rule.categoria === "CMV") {
      if (rule.tipo_regra === "threshold_max" && rule.valor_max !== null) {
        triggered = cmvPercent > rule.valor_max;
      }
      if (rule.tipo_regra === "intervalo_recomendado" && rule.valor_max !== null) {
        triggered = cmvPercent > rule.valor_max;
      }
    }

    if (rule.categoria === "precificacao") {
      if (rule.tipo_regra === "threshold_min" && rule.valor_min !== null) {
        triggered = price < rule.valor_min;
      }
      if (rule.tipo_regra === "threshold_max" && rule.valor_max !== null) {
        triggered = margem * 100 < (rule.valor_max ?? 0);
      }
    }

    if (rule.tags?.includes("margem_minima")) {
      triggered = margem * 100 < rule.valor_min;
    }

    if (rule.tags?.includes("risco_prejuizo")) {
      triggered = lucroLiquido <= 0;
    }

    if (triggered) {
      results.push({
        problema_tipo: rule.insight_text,
        produto: item.name,
        nivel_risco: rule.impacto as "alto" | "medio" | "baixo",
        explicacao: rule.descricao_regra,
        recomendacao: rule.insight_text,
      });
    }
  }

  return results;
}

function evaluateAggregateRules(
  items: FullMenuItem[],
  rules: DeliveryInsightRule[]
): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];
  if (items.length === 0) return results;

  const totalItems = items.length;
  const prices = items.map((i) => i.price).filter((p) => p > 0);
  const ticketMedio = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  for (const rule of rules) {
    let triggered = false;

    if (rule.categoria === "cardapio") {
      if (rule.tipo_regra === "threshold_max" && rule.valor_max !== null) {
        triggered = totalItems > rule.valor_max;
      }
      if (rule.tipo_regra === "threshold_min" && rule.valor_min !== null) {
        triggered = totalItems < rule.valor_min;
      }
    }

    if (rule.categoria === "ticket_medio") {
      if (rule.tipo_regra === "threshold_min" && rule.valor_min !== null) {
        triggered = ticketMedio < rule.valor_min;
      }
    }

    if (triggered) {
      results.push({
        problema_tipo: rule.insight_text,
        produto: null,
        nivel_risco: rule.impacto as "alto" | "medio" | "baixo",
        explicacao: rule.descricao_regra,
        recomendacao: rule.insight_text,
      });
    }
  }

  return results;
}

export function useDeliveryInsights(menuItems: FullMenuItem[] | undefined) {
  const { data: rules } = useQuery({
    queryKey: ["delivery-insights-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_insights" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as DeliveryInsightRule[];
    },
    staleTime: 1000 * 60 * 30,
  });

  const diagnostics = useMemo(() => {
    if (!rules || !menuItems || menuItems.length === 0) return [];

    const itemRules = rules.filter((r) =>
      ["CMV", "precificacao"].includes(r.categoria) || r.tags?.includes("margem_minima") || r.tags?.includes("risco_prejuizo")
    );
    const aggRules = rules.filter((r) =>
      ["cardapio", "ticket_medio", "operacao", "logistica", "cancelamentos"].includes(r.categoria)
    );

    const itemResults: DiagnosticResult[] = [];
    for (const item of menuItems) {
      itemResults.push(...evaluateItemRules(item, itemRules));
    }

    const aggResults = evaluateAggregateRules(menuItems, aggRules);

    // Deduplicate item-level by tipo+produto, keep highest risk
    const seen = new Map<string, DiagnosticResult>();
    for (const r of itemResults) {
      const key = `${r.problema_tipo}::${r.produto}`;
      const existing = seen.get(key);
      if (!existing || riskLevel(r.nivel_risco) > riskLevel(existing.nivel_risco)) {
        seen.set(key, r);
      }
    }

    const all = [...seen.values(), ...aggResults];
    // Sort: alto first
    all.sort((a, b) => riskLevel(b.nivel_risco) - riskLevel(a.nivel_risco));
    return all;
  }, [rules, menuItems]);

  return { diagnostics, isLoading: !rules };
}

function riskLevel(level: string): number {
  if (level === "alto") return 3;
  if (level === "medio") return 2;
  return 1;
}
