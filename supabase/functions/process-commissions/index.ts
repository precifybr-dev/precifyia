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
    // ── Only service_role can call this ──────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Verify caller is using service_role key
    if (token !== serviceRoleKey) {
      // Also check if it's a master user via JWT
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsErr } =
        await anonClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return json({ error: "Não autorizado" }, 401);
      }

      const callerId = claimsData.claims.sub as string;
      const sc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey
      );

      const { data: masterCheck } = await sc
        .from("user_roles")
        .select("role, is_protected")
        .eq("user_id", callerId)
        .eq("role", "master")
        .eq("is_protected", true)
        .maybeSingle();

      if (!masterCheck) {
        return json(
          { error: "Apenas o administrador master pode processar comissões" },
          403
        );
      }
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // ── Input ────────────────────────────────────────────
    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────────
    // ACTION: generate — generate commission for a confirmed payment
    // ──────────────────────────────────────────────────────
    if (action === "generate") {
      const {
        referred_user_id,
        payment_id,
        paid_amount,
        period_month,
        period_year,
      } = body;

      // Whitelisting — only allowed fields
      if (!referred_user_id || !paid_amount || paid_amount <= 0) {
        return json(
          { error: "referred_user_id e paid_amount são obrigatórios" },
          400
        );
      }

      // Find coupon_use for this user to determine affiliate
      const { data: couponUse } = await serviceClient
        .from("coupon_uses")
        .select("coupon_id, coupons(affiliate_id)")
        .eq("user_id", referred_user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!couponUse?.coupons?.affiliate_id) {
        return json(
          { error: "Usuário não foi indicado por nenhum afiliado" },
          404
        );
      }

      const affiliateId = couponUse.coupons.affiliate_id;

      // Get affiliate's commission rate
      const { data: affiliate } = await serviceClient
        .from("affiliates")
        .select("id, commission_rate, status")
        .eq("id", affiliateId)
        .single();

      if (!affiliate || affiliate.status !== "active") {
        return json({ error: "Afiliado não está ativo" }, 400);
      }

      // Count existing commissions for this referral to determine recurring_month
      const { count: existingCount } = await serviceClient
        .from("commissions")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateId)
        .eq("referred_user_id", referred_user_id);

      const recurringMonth = (existingCount || 0) + 1;

      // Max 12 months
      if (recurringMonth > 12) {
        return json(
          {
            message:
              "Período máximo de comissão recorrente atingido (12 meses)",
            commission_generated: false,
          },
          200
        );
      }

      // Dedup check: same affiliate + referred_user + month/year
      const currentMonth = period_month || new Date().getMonth() + 1;
      const currentYear = period_year || new Date().getFullYear();

      const { count: dupCheck } = await serviceClient
        .from("commissions")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateId)
        .eq("referred_user_id", referred_user_id)
        .eq("period_month", currentMonth)
        .eq("period_year", currentYear);

      if (dupCheck && dupCheck > 0) {
        return json(
          {
            message: "Comissão já gerada para este período",
            commission_generated: false,
          },
          200
        );
      }

      // Calculate commission
      const commissionRate = affiliate.commission_rate;
      const commissionAmount = (paid_amount * commissionRate) / 100;

      // Insert commission
      const { data: commission, error: insertErr } = await serviceClient
        .from("commissions")
        .insert({
          affiliate_id: affiliateId,
          coupon_id: couponUse.coupon_id,
          referred_user_id,
          payment_id: payment_id || null,
          paid_amount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          status: "pending",
          period_month: currentMonth,
          period_year: currentYear,
          recurring_month: recurringMonth,
          max_recurring_months: 12,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Error inserting commission:", insertErr);
        return json({ error: "Erro ao gerar comissão" }, 500);
      }

      // Update affiliate totals
      await serviceClient
        .from("affiliates")
        .update({
          total_pending: affiliate.status === "active"
            ? (await serviceClient
                .from("commissions")
                .select("commission_amount")
                .eq("affiliate_id", affiliateId)
                .in("status", ["pending", "eligible"])
                .then(({ data }) =>
                  (data || []).reduce(
                    (sum, c) => sum + (c.commission_amount || 0),
                    0
                  )
                ))
            : 0,
        })
        .eq("id", affiliateId);

      return json({
        commission_generated: true,
        commission_id: commission.id,
        commission_amount: commissionAmount,
        recurring_month: recurringMonth,
      });
    }

    // ──────────────────────────────────────────────────────
    // ACTION: advance-status — pending → eligible (batch)
    // ──────────────────────────────────────────────────────
    if (action === "advance-status") {
      const { min_days_pending = 7 } = body;

      const cutoffDate = new Date(
        Date.now() - min_days_pending * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: advanced, error: advErr } = await serviceClient
        .from("commissions")
        .update({ status: "eligible" })
        .eq("status", "pending")
        .lte("created_at", cutoffDate)
        .select("id");

      if (advErr) {
        console.error("Error advancing status:", advErr);
        return json({ error: "Erro ao avançar status" }, 500);
      }

      return json({
        advanced_count: advanced?.length || 0,
        message: `${advanced?.length || 0} comissões avançadas para eligible`,
      });
    }

    // ──────────────────────────────────────────────────────
    // ACTION: approve — eligible → approved (batch or single)
    // ──────────────────────────────────────────────────────
    if (action === "approve") {
      const { commission_ids } = body;

      if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
        return json({ error: "commission_ids é obrigatório" }, 400);
      }

      const { data: approved, error: appErr } = await serviceClient
        .from("commissions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("status", "eligible")
        .in("id", commission_ids)
        .select("id");

      if (appErr) {
        console.error("Error approving:", appErr);
        return json({ error: "Erro ao aprovar comissões" }, 500);
      }

      return json({
        approved_count: approved?.length || 0,
      });
    }

    // ──────────────────────────────────────────────────────
    // ACTION: cancel-for-user — cancel future commissions on churn
    // ──────────────────────────────────────────────────────
    if (action === "cancel-for-user") {
      const { referred_user_id, reason } = body;

      if (!referred_user_id) {
        return json({ error: "referred_user_id é obrigatório" }, 400);
      }

      const { data: cancelled, error: cancelErr } = await serviceClient
        .from("commissions")
        .update({
          status: "cancelled",
          cancelled_reason: reason || "Cliente cancelou assinatura",
        })
        .eq("referred_user_id", referred_user_id)
        .in("status", ["pending", "eligible"])
        .select("id");

      if (cancelErr) {
        console.error("Error cancelling:", cancelErr);
        return json({ error: "Erro ao cancelar comissões" }, 500);
      }

      return json({
        cancelled_count: cancelled?.length || 0,
        message: `Comissões futuras canceladas para o usuário`,
      });
    }

    return json({ error: "Ação inválida. Use: generate, advance-status, approve, cancel-for-user" }, 400);
  } catch (err) {
    console.error("process-commissions error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
