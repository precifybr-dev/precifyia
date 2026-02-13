import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Token inválido" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // ── Service client for writes ────────────────────────
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Rate limit (IP) ──────────────────────────────────
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const { data: rl } = await serviceClient.rpc("check_rate_limit", {
      _key: clientIp,
      _endpoint: "validate-coupon",
      _max_requests: 10,
      _window_seconds: 60,
      _block_seconds: 120,
    });

    if (rl && rl.length > 0 && !rl[0].allowed) {
      return json(
        {
          error: "Muitas tentativas. Tente novamente em alguns minutos.",
          retry_after: rl[0].retry_after_seconds,
        },
        429
      );
    }

    // ── Input ────────────────────────────────────────────
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return json({ error: "Código do cupom é obrigatório" }, 400);
    }

    const cleanCode = code.trim().toUpperCase();

    // ── Fetch coupon ─────────────────────────────────────
    const { data: coupon, error: couponErr } = await serviceClient
      .from("coupons")
      .select("*, affiliates(id, user_id, email, status, commission_rate)")
      .eq("code", cleanCode)
      .maybeSingle();

    if (couponErr || !coupon) {
      return json({ error: "Cupom não encontrado" }, 404);
    }

    // ── Validations ──────────────────────────────────────

    // 1. Active
    if (!coupon.is_active) {
      return json({ error: "Este cupom está desativado" }, 400);
    }

    // 2. Not expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return json({ error: "Este cupom expirou" }, 400);
    }

    // 3. Not before start
    if (new Date(coupon.starts_at) > new Date()) {
      return json({ error: "Este cupom ainda não está válido" }, 400);
    }

    // 4. Usage limit
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return json({ error: "Este cupom atingiu o limite de usos" }, 400);
    }

    // 5. Influencer coupon must have active affiliate
    if (
      coupon.coupon_type === "influencer" ||
      coupon.coupon_type === "trial_influencer"
    ) {
      if (!coupon.affiliates || coupon.affiliates.status !== "active") {
        return json(
          { error: "Afiliado vinculado a este cupom não está ativo" },
          400
        );
      }
    }

    // 6. Self-referral check
    if (coupon.affiliates && coupon.affiliates.user_id === userId) {
      // Log fraud flag
      await serviceClient.from("fraud_flags").insert({
        flag_type: "self_referral",
        severity: "high",
        user_id: userId,
        affiliate_id: coupon.affiliates.id,
        coupon_id: coupon.id,
        description: `Tentativa de autoindicação: user ${userId} tentou usar cupom do próprio afiliado`,
        metadata: { ip: clientIp },
      });
      return json({ error: "Não é permitido usar seu próprio cupom" }, 403);
    }

    // 7. Check if user already used this coupon
    const { count: existingUses } = await serviceClient
      .from("coupon_uses")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId);

    if (existingUses && existingUses > 0) {
      return json({ error: "Você já utilizou este cupom" }, 400);
    }

    // 8. IP abuse check (same IP, different users, within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipUses } = await serviceClient
      .from("coupon_uses")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("ip_address", clientIp)
      .gte("created_at", oneHourAgo);

    if (ipUses && ipUses >= 3) {
      await serviceClient.from("fraud_flags").insert({
        flag_type: "ip_abuse",
        severity: "medium",
        user_id: userId,
        affiliate_id: coupon.affiliate_id,
        coupon_id: coupon.id,
        description: `Múltiplos usos do mesmo IP (${clientIp}) em menos de 1h`,
        metadata: { ip: clientIp, uses_count: ipUses },
      });
      return json(
        { error: "Atividade suspeita detectada. Tente novamente mais tarde." },
        429
      );
    }

    // ── Calculate discount ───────────────────────────────
    let appliedDiscount = 0;
    let trialDays = 0;

    if (coupon.discount_type === "percentage") {
      appliedDiscount = coupon.discount_value; // percentage to be applied by caller
    } else if (coupon.discount_type === "fixed") {
      appliedDiscount = coupon.discount_value;
    } else if (coupon.discount_type === "trial_days") {
      trialDays = coupon.discount_value;
    }

    // ── Register usage (trigger increments current_uses) ─
    const userAgent = req.headers.get("user-agent") || null;
    const { error: insertErr } = await serviceClient
      .from("coupon_uses")
      .insert({
        coupon_id: coupon.id,
        user_id: userId,
        ip_address: clientIp,
        user_agent: userAgent,
        applied_discount: appliedDiscount || trialDays,
      });

    if (insertErr) {
      console.error("Error inserting coupon use:", insertErr);
      return json({ error: "Erro ao registrar uso do cupom" }, 500);
    }

    // ── Response ─────────────────────────────────────────
    return json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      coupon_type: coupon.coupon_type,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      applied_discount: appliedDiscount,
      trial_days: trialDays,
      affiliate_id: coupon.affiliate_id || null,
    });
  } catch (err) {
    console.error("validate-coupon error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
