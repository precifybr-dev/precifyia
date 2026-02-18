import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Calculation Version ───
const CALCULATION_VERSION = "ifood-fees-v1";

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const IFOOD_PAYMENT_FEE = 3.2;
const ANTICIPATION_WEEKLY = 1.99;
const ANTICIPATION_MONTHLY = 0;
const AUTO_RATE_OWN_DELIVERY = 12;
const AUTO_RATE_IFOOD_DELIVERY = 23;

interface IfoodInput {
  plan_type: string | null;
  base_rate: number | null;
  anticipation_type: string;
  anticipation_rate: number | null;
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

    // ─── Rate Limiting: 10 req/min por usuário ───
    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      _key: user.id, _endpoint: "ifood-fees", _max_requests: 10, _window_seconds: 60, _block_seconds: 120,
    });
    const rl = rlData?.[0];
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retry_after_seconds) },
      });
    }

    const rawBody = await req.json();

    // ─── MASS ASSIGNMENT PROTECTION: Only allow whitelisted fields ───
    const ALLOWED_FIELDS = [
      'plan_type', 'base_rate', 'anticipation_type', 'anticipation_rate', 'monthly_orders',
      'average_ticket', 'offers_coupon', 'orders_with_coupon', 'coupon_value',
      'coupon_type', 'coupon_absorber', 'has_delivery_fee', 'delivery_fee',
      'delivery_absorber', 'store_id',
    ];
    const body: IfoodInput & { store_id?: string | null } = {} as any;
    for (const key of ALLOWED_FIELDS) {
      if (key in rawBody) {
        (body as any)[key] = rawBody[key];
      }
    }
    const warnings: string[] = [];

    // ─── RBAC: Validate store access ───
    if (body.store_id) {
      const { data: storeRole } = await supabase.rpc("get_store_role", {
        _user_id: user.id,
        _store_id: body.store_id,
      });

      if (!storeRole) {
        return new Response(JSON.stringify({ error: "Você não tem acesso a esta loja." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // This function WRITES to profile (saves ifood_real_percentage)
      // Only owner and admin can do that
      if (storeRole === "viewer") {
        return new Response(JSON.stringify({ error: "Viewers não podem alterar configurações de taxas." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Validation ───
    const planType = body.plan_type;
    if (!planType) {
      return new Response(JSON.stringify({
        real_percentage: null,
        base_rate_real: null,
        monthly_revenue: 0,
        coupon_monthly_cost: 0,
        coupon_impact_percent: 0,
        delivery_monthly_cost: 0,
        delivery_impact_percent: 0,
        anticipation_fee: 0,
        warnings: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseRate = isValidNumber(body.base_rate) ? body.base_rate : 
      (planType === "own_delivery" ? AUTO_RATE_OWN_DELIVERY : AUTO_RATE_IFOOD_DELIVERY);

    if (baseRate < 0 || baseRate >= 100) {
      return new Response(JSON.stringify({ error: "Taxa base do iFood está fora do intervalo permitido (0-99.99%)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anticipationType = body.anticipation_type || "weekly";
    const customRate = isValidNumber(body.anticipation_rate) && body.anticipation_rate >= 0 && body.anticipation_rate <= 5
      ? body.anticipation_rate : ANTICIPATION_WEEKLY;
    const anticipationFee = anticipationType === "weekly" ? customRate : ANTICIPATION_MONTHLY;

    // Base rate real = plan rate + payment fee + anticipation
    const baseRateReal = baseRate + IFOOD_PAYMENT_FEE + anticipationFee;
    let realPercentage = baseRateReal;

    // ─── Volume data ───
    const monthlyOrders = isValidNumber(body.monthly_orders) && body.monthly_orders >= 0 ? body.monthly_orders : 0;
    const averageTicket = isValidNumber(body.average_ticket) && body.average_ticket >= 0 ? body.average_ticket : 0;
    const monthlyRevenue = monthlyOrders * averageTicket;

    // ─── Coupon impact ───
    let couponMonthlyCost = 0;
    let couponImpactPercent = 0;

    if (body.offers_coupon && isValidNumber(body.coupon_value) && body.coupon_value > 0 && body.coupon_absorber !== "ifood") {
      const ordersWithCoupon = isValidNumber(body.orders_with_coupon) ? body.orders_with_coupon : 0;

      if (body.coupon_type === "percent") {
        couponMonthlyCost = ordersWithCoupon * averageTicket * (body.coupon_value / 100);
      } else {
        couponMonthlyCost = ordersWithCoupon * body.coupon_value;
      }

      if (body.coupon_absorber === "partial") {
        couponMonthlyCost *= 0.5;
      }

      if (monthlyRevenue > 0) {
        couponImpactPercent = (couponMonthlyCost / monthlyRevenue) * 100;
        realPercentage += couponImpactPercent;
      }
    }

    // ─── Delivery impact ───
    let deliveryMonthlyCost = 0;
    let deliveryImpactPercent = 0;

    if (body.has_delivery_fee && body.delivery_absorber === "business" && isValidNumber(body.delivery_fee) && body.delivery_fee > 0) {
      deliveryMonthlyCost = monthlyOrders * body.delivery_fee;

      if (monthlyRevenue > 0) {
        deliveryImpactPercent = (deliveryMonthlyCost / monthlyRevenue) * 100;
        realPercentage += deliveryImpactPercent;
      }
    }

    // Ensure non-negative and round
    realPercentage = Math.max(0, parseFloat(realPercentage.toFixed(2)));
    couponImpactPercent = parseFloat(couponImpactPercent.toFixed(2));
    deliveryImpactPercent = parseFloat(deliveryImpactPercent.toFixed(2));

    // ─── Warnings ───
    if (realPercentage === 0 && planType) {
      warnings.push("A taxa base real não pode ser zero com o iFood ativo. Verifique os valores informados.");
    }

    if (planType === "ifood_delivery" && baseRate < 20) {
      warnings.push("Atenção: esta taxa está diferente do padrão do iFood para Entrega iFood. Confirme se está correta.");
    }

    if (planType === "own_delivery" && baseRate < 8) {
      warnings.push("Atenção: esta taxa está diferente do padrão do iFood para Entrega Própria. Confirme se está correta.");
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── FAIL-SAFE GATE: All outputs must be valid BEFORE any persistence ───
    // If ANY value is invalid, abort entirely — never persist partial data
    // ═══════════════════════════════════════════════════════════════
    const allOutputs = {
      realPercentage, baseRateReal: parseFloat(baseRateReal.toFixed(2)),
      monthlyRevenue, couponMonthlyCost, deliveryMonthlyCost,
      couponImpactPercent, deliveryImpactPercent, anticipationFee,
    };

    for (const [key, v] of Object.entries(allOutputs)) {
      if (!isValidNumber(v)) {
        console.error(`[FAIL-SAFE] Invalid output detected: ${key} = ${v}`);
        return new Response(JSON.stringify({ error: "Detectamos uma inconsistência no cálculo das taxas iFood. Nenhum dado foi salvo." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Additional fail-safe: realPercentage must be within sane bounds
    if (realPercentage >= 100) {
      return new Response(JSON.stringify({ error: "A taxa real calculada excede 100%. Verifique os valores informados. Nenhum dado foi salvo." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PERSIST: Only after all validations pass ───
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        ifood_real_percentage: realPercentage,
        ifood_calculation_version: CALCULATION_VERSION,
      })
      .eq("user_id", user.id);

    if (saveError) {
      console.error("[FAIL-SAFE] Save failed, no data persisted:", saveError);
      return new Response(JSON.stringify({ error: "Erro ao salvar taxa iFood. Nenhum dado foi alterado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = {
      real_percentage: realPercentage,
      base_rate_real: parseFloat(baseRateReal.toFixed(2)),
      anticipation_fee: anticipationFee,
      monthly_revenue: parseFloat(monthlyRevenue.toFixed(2)),
      coupon_monthly_cost: parseFloat(couponMonthlyCost.toFixed(2)),
      coupon_impact_percent: couponImpactPercent,
      delivery_monthly_cost: parseFloat(deliveryMonthlyCost.toFixed(2)),
      delivery_impact_percent: deliveryImpactPercent,
      warnings,
      calculation_version: CALCULATION_VERSION,
    };

    // ─── Save calculation history (immutable) ───
    await supabase.from("calculation_history").insert({
      user_id: user.id,
      store_id: body.store_id || null,
      entity_type: "ifood_fees",
      entity_id: null,
      calculation_version: CALCULATION_VERSION,
      input_snapshot: {
        plan_type: planType,
        base_rate: baseRate,
        anticipation_type: anticipationType,
        monthly_orders: body.monthly_orders,
        average_ticket: body.average_ticket,
        offers_coupon: body.offers_coupon,
        coupon_value: body.coupon_value,
        coupon_type: body.coupon_type,
        has_delivery_fee: body.has_delivery_fee,
        delivery_fee: body.delivery_fee,
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
    console.error("calculate-ifood-fees error:", err);
    return new Response(JSON.stringify({ error: "Não foi possível calcular as taxas do iFood." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
