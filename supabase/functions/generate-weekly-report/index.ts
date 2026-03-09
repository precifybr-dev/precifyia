import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RecipeRow {
  name: string;
  total_cost: number;
  selling_price: number | null;
  cost_per_serving: number;
  ifood_selling_price: number | null;
  cmv_target: number | null;
  user_id: string;
  store_id: string | null;
}

interface ProductDetail {
  name: string;
  price: number;
  cost: number;
  margin: number;
  cmv: number;
  estimatedProfit: number;
  message: string;
  suggestion?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function analyzeRecipes(recipes: RecipeRow[]) {
  const critical: ProductDetail[] = [];
  const improvement: ProductDetail[] = [];
  const strong: ProductDetail[] = [];

  let lossCount = 0;
  let lowMarginCount = 0;
  let balancedCount = 0;
  let healthyCount = 0;

  for (const r of recipes) {
    const price = r.selling_price || 0;
    const cost = r.cost_per_serving || r.total_cost || 0;
    if (price <= 0 || cost <= 0) continue;

    const profit = price - cost;
    const margin = (profit / price) * 100;
    const cmv = (cost / price) * 100;

    const detail: ProductDetail = {
      name: r.name,
      price,
      cost,
      margin: Math.round(margin * 10) / 10,
      cmv: Math.round(cmv * 10) / 10,
      estimatedProfit: Math.round(profit * 100) / 100,
      message: "",
    };

    if (profit < 0) {
      lossCount++;
      detail.message = "Esse produto pode estar operando no prejuízo.";
      detail.suggestion = `Preço mínimo sugerido: ${formatCurrency(cost * 1.1)}`;
      critical.push(detail);
    } else if (margin < 5) {
      lowMarginCount++;
      detail.message = "Margem crítica — muito perto do prejuízo.";
      const targetPrice = cost / (1 - 0.15);
      detail.suggestion = `Se subir para ${formatCurrency(targetPrice)}, a margem sobe para ~15%.`;
      critical.push(detail);
    } else if (cmv > 40) {
      lowMarginCount++;
      detail.message = "CMV alto — custo consumindo grande parte da venda.";
      improvement.push(detail);
    } else if (margin < 12) {
      balancedCount++;
      const newPrice = price + 2;
      const newMargin = ((newPrice - cost) / newPrice) * 100;
      detail.message = "Um pequeno ajuste de preço pode melhorar sua margem.";
      detail.suggestion = `Se subir ${formatCurrency(2)}, a margem sobe de ${margin.toFixed(0)}% para ${newMargin.toFixed(0)}%.`;
      improvement.push(detail);
    } else if (margin >= 20) {
      healthyCount++;
      detail.message = "Esse produto tem boa margem e pode ser usado em promoções ou combos.";
      strong.push(detail);
    } else {
      balancedCount++;
    }
  }

  // Limit to 3 each
  const advisorMessage =
    lossCount > 0
      ? "Seu cardápio tem produtos que merecem atenção urgente para evitar prejuízo."
      : lowMarginCount > 0
        ? "Seu cardápio tem oportunidades de melhoria na margem."
        : "Seu cardápio está com margens equilibradas. Continue monitorando!";

  return {
    summary: {
      loss_products: lossCount,
      low_margin_products: lowMarginCount,
      balanced_products: balancedCount,
      healthy_products: healthyCount,
    },
    critical_products: critical.slice(0, 3),
    improvement_opportunities: improvement.slice(0, 3),
    strong_products: strong.slice(0, 3),
    advisor_message: advisorMessage,
    total_products_analyzed: recipes.filter(
      (r) => (r.selling_price || 0) > 0 && (r.cost_per_serving || r.total_cost || 0) > 0
    ).length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = body.store_id || null;

    // Fetch recipes
    let query = supabase
      .from("recipes")
      .select("name, total_cost, selling_price, cost_per_serving, ifood_selling_price, cmv_target, user_id, store_id")
      .eq("user_id", user.id)
      .order("name");

    if (storeId) query = query.eq("store_id", storeId);

    const { data: recipes, error: recipesError } = await query;
    if (recipesError) throw recipesError;

    if (!recipes || recipes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum produto cadastrado para gerar relatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = analyzeRecipes(recipes);

    // Save report
    const { data: report, error: insertError } = await supabase
      .from("dr_margem_reports")
      .insert({
        user_id: user.id,
        store_id: storeId,
        summary: analysis.summary,
        critical_products: analysis.critical_products,
        improvement_opportunities: analysis.improvement_opportunities,
        strong_products: analysis.strong_products,
        advisor_message: analysis.advisor_message,
        total_products_analyzed: analysis.total_products_analyzed,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error generating report:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
