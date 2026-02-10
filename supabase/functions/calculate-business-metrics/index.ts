import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional store_id from body
    let storeId: string | null = null;
    try {
      const body = await req.json();
      storeId = body.store_id || null;
    } catch {
      // No body is ok
    }

    // ─── Fetch all data in parallel ───
    const storeFilter = (query: any) => {
      if (storeId) return query.eq("store_id", storeId);
      return query.is("store_id", null);
    };

    const [
      { data: profile },
      { data: fixedCosts },
      { data: variableCosts },
      { data: fixedExpenses },
      { data: variableExpenses },
      { data: taxData },
      { data: cardFees },
    ] = await Promise.all([
      supabase.from("profiles").select("monthly_revenue, cost_limit_percent").eq("user_id", user.id).maybeSingle(),
      storeFilter(supabase.from("fixed_costs").select("value_per_item").eq("user_id", user.id)),
      storeFilter(supabase.from("variable_costs").select("value_per_item").eq("user_id", user.id)),
      storeFilter(supabase.from("fixed_expenses").select("monthly_value").eq("user_id", user.id)),
      storeFilter(supabase.from("variable_expenses").select("monthly_value").eq("user_id", user.id)),
      storeFilter(supabase.from("business_taxes").select("tax_percentage").eq("user_id", user.id)).maybeSingle(),
      storeFilter(supabase.from("card_fees").select("fee_percentage").eq("user_id", user.id)),
    ]);

    // ─── Calculate totals ───
    const fixedCostsTotal = fixedCosts?.reduce((s: number, c: any) => s + Number(c.value_per_item || 0), 0) || 0;
    const variableCostsTotal = variableCosts?.reduce((s: number, c: any) => s + Number(c.value_per_item || 0), 0) || 0;
    const productionCostsTotal = fixedCostsTotal + variableCostsTotal;

    const fixedExpensesTotal = fixedExpenses?.reduce((s: number, e: any) => s + Number(e.monthly_value || 0), 0) || 0;
    const variableExpensesTotal = variableExpenses?.reduce((s: number, e: any) => s + Number(e.monthly_value || 0), 0) || 0;
    const totalExpenses = fixedExpensesTotal + variableExpensesTotal;

    const monthlyRevenue = profile?.monthly_revenue ? Number(profile.monthly_revenue) : null;
    const costLimitPercent = profile?.cost_limit_percent ?? 40;

    const taxPercentage = taxData?.tax_percentage ? Number(taxData.tax_percentage) : 0;
    const averageCardFee = cardFees && cardFees.length > 0
      ? cardFees.reduce((s: number, f: any) => s + Number(f.fee_percentage || 0), 0) / cardFees.length
      : 0;
    const totalDeductions = taxPercentage + averageCardFee;

    const hasRevenue = monthlyRevenue !== null && monthlyRevenue > 0;

    // ─── Percentage calculations ───
    const productionCostsPercent = hasRevenue ? (productionCostsTotal / monthlyRevenue) * 100 : null;

    const fixedExpensesPercent = hasRevenue ? (fixedExpensesTotal / monthlyRevenue) * 100 : null;
    const variableExpensesPercent = hasRevenue ? (variableExpensesTotal / monthlyRevenue) * 100 : null;
    const totalExpensesPercent = hasRevenue ? (totalExpenses / monthlyRevenue) * 100 : null;

    const isOverLimit = totalExpensesPercent !== null && totalExpensesPercent > costLimitPercent;
    const excessPercent = isOverLimit ? totalExpensesPercent - costLimitPercent : 0;

    // ─── DRE Simplificado ───
    const netResult = hasRevenue ? monthlyRevenue - totalExpenses : null;
    const netMarginPercent = hasRevenue && netResult !== null ? (netResult / monthlyRevenue) * 100 : null;
    const isProfit = netResult !== null && netResult >= 0;

    // ─── Production cost remaining margin ───
    const productionRemainingMargin = productionCostsPercent !== null ? 100 - productionCostsPercent : null;

    // ─── Anti-fraud checks ───
    const warnings: string[] = [];

    const allValues = [
      fixedCostsTotal, variableCostsTotal, fixedExpensesTotal, variableExpensesTotal,
    ];
    for (const v of allValues) {
      if (!isValidNumber(v)) {
        throw new ValidationError("Detectamos valores inválidos nos dados financeiros. Verifique os cadastros.");
      }
    }

    if (netResult !== null && netResult < 0) {
      warnings.push("Suas despesas estão maiores que o faturamento. Revise os gastos para equilibrar as contas.");
    }

    if (isOverLimit) {
      warnings.push(`Seu custo total está ${excessPercent.toFixed(2)}% acima do limite configurado de ${costLimitPercent}%. Revise suas despesas.`);
    }

    if (productionCostsPercent !== null && productionCostsPercent >= 100) {
      warnings.push("Os custos de produção superam o faturamento mensal. Revise seus custos.");
    }

    // ─── Build response ───
    const round2 = (v: number | null) => v !== null ? parseFloat(v.toFixed(2)) : null;

    const result = {
      // Production costs
      fixed_costs_total: round2(fixedCostsTotal),
      variable_costs_total: round2(variableCostsTotal),
      production_costs_total: round2(productionCostsTotal),
      production_costs_percent: round2(productionCostsPercent),
      production_remaining_margin: round2(productionRemainingMargin),

      // Business expenses
      fixed_expenses_total: round2(fixedExpensesTotal),
      variable_expenses_total: round2(variableExpensesTotal),
      total_expenses: round2(totalExpenses),
      fixed_expenses_percent: round2(fixedExpensesPercent),
      variable_expenses_percent: round2(variableExpensesPercent),
      total_expenses_percent: round2(totalExpensesPercent),

      // Limit
      cost_limit_percent: costLimitPercent,
      is_over_limit: isOverLimit,
      excess_percent: round2(excessPercent),

      // Taxes & fees
      tax_percentage: round2(taxPercentage),
      average_card_fee: round2(averageCardFee),
      total_deductions: round2(totalDeductions),

      // DRE
      monthly_revenue: round2(monthlyRevenue),
      net_result: round2(netResult),
      net_margin_percent: round2(netMarginPercent),
      is_profit: isProfit,

      // Warnings
      warnings,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const isValidation = err instanceof ValidationError;
    const status = isValidation ? 400 : 500;
    const message = isValidation
      ? err.message
      : "Não foi possível calcular as métricas do negócio.";

    console.error("calculate-business-metrics error:", err);

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
