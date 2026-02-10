import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const IFOOD_PAYMENT_FEE = 3.2;
const ANTICIPATION_WEEKLY = 1.59;
const ANTICIPATION_MONTHLY = 0;
const AUTO_RATE_OWN_DELIVERY = 12;
const AUTO_RATE_IFOOD_DELIVERY = 23;

interface IfoodInput {
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

    const body: IfoodInput & { store_id?: string | null } = await req.json();
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
    const anticipationFee = anticipationType === "weekly" ? ANTICIPATION_WEEKLY : ANTICIPATION_MONTHLY;

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

    // Anti-fraud: check all outputs
    const allValues = [realPercentage, baseRateReal, monthlyRevenue, couponMonthlyCost, deliveryMonthlyCost];
    for (const v of allValues) {
      if (!isValidNumber(v)) {
        return new Response(JSON.stringify({ error: "Detectamos uma inconsistência no cálculo das taxas iFood." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Save to profile ───
    await supabase
      .from("profiles")
      .update({ ifood_real_percentage: realPercentage })
      .eq("user_id", user.id);

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
    };

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
