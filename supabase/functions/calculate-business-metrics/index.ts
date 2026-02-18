import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Calculation Version ───
const CALCULATION_VERSION = "business-metrics-v1";

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

    // ─── Rate Limiting: 30 req/min por usuário, block 30s ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      _key: user.id, _endpoint: "business-metrics", _max_requests: 60, _window_seconds: 60, _block_seconds: 15,
    });
    const rl = rlData?.[0];
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retry_after_seconds) },
      });
    }

    // ─── MASS ASSIGNMENT PROTECTION: Only accept store_id ───
    let storeId: string | null = null;
    try {
      const rawBody = await req.json();
      // Only allow store_id — reject everything else silently
      if (typeof rawBody.store_id === 'string' && rawBody.store_id.length > 0) {
        storeId = rawBody.store_id;
      }
    } catch {
      // No body is ok
    }

    // ─── RBAC: Validate store access ───
    if (storeId) {
      const { data: storeRole } = await supabase.rpc("get_store_role", {
        _user_id: user.id,
        _store_id: storeId,
      });

      if (!storeRole) {
        return new Response(JSON.stringify({ error: "Você não tem acesso a esta loja." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Viewers with view_financials permission can read business metrics
      if (storeRole === "viewer") {
        const { data: hasFinancialPerm } = await supabase.rpc("viewer_has_permission", {
          _user_id: user.id,
          _store_id: storeId,
          _permission: "view_financials",
        });
        if (!hasFinancialPerm) {
          return new Response(JSON.stringify({ error: "Você não tem permissão para ver dados financeiros desta loja." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
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

    // ─── Indicador de Saúde do Lucro ───
    let profit_health_status: string | null = null;
    if (netMarginPercent !== null) {
      if (netMarginPercent < 10) profit_health_status = "critico";
      else if (netMarginPercent < 20) profit_health_status = "apertado";
      else if (netMarginPercent <= 30) profit_health_status = "saudavel";
      else profit_health_status = "acima_media";
    }

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
      profit_health_status,

      // Warnings
      warnings,

      // Version
      calculation_version: CALCULATION_VERSION,
    };

    // ─── Save calculation history (immutable) ───
    await supabase.from("calculation_history").insert({
      user_id: user.id,
      store_id: storeId || null,
      entity_type: "business_metrics",
      entity_id: null,
      calculation_version: CALCULATION_VERSION,
      input_snapshot: {
        monthly_revenue: monthlyRevenue,
        cost_limit_percent: costLimitPercent,
        fixed_costs_count: fixedCosts?.length || 0,
        variable_costs_count: variableCosts?.length || 0,
        fixed_expenses_count: fixedExpenses?.length || 0,
        variable_expenses_count: variableExpenses?.length || 0,
        tax_percentage: taxPercentage,
        card_fees_count: cardFees?.length || 0,
      },
      output_snapshot: result,
    }).then(({ error }) => {
      if (error) console.error("[VERSION] Failed to save calculation history:", error);
    });

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
