import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { strategyId, storeId } = await req.json();
    if (!strategyId) {
      return new Response(JSON.stringify({ error: "Estratégia é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check plan limits (shared with combos_ai)
    const { data: planCheck } = await supabaseAdmin.rpc("check_plan_feature", {
      _user_id: user.id,
      _feature: "combos_ai",
    });

    const planInfo = planCheck?.[0];
    if (!planInfo?.allowed) {
      return new Response(JSON.stringify({ error: planInfo?.reason || "Funcionalidade não disponível" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usageCount } = await supabaseAdmin
      .from("combo_generation_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const limit = planInfo.usage_limit;
    if (limit !== null && (usageCount ?? 0) >= limit) {
      return new Response(JSON.stringify({ error: `Limite de ${limit} uso(s) por mês atingido.` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recipes and beverages
    const [recipesRes, beveragesRes, profileRes] = await Promise.all([
      supabaseAdmin.from("recipes")
        .select("name, total_cost, cost_per_serving, selling_price, suggested_price, ifood_selling_price")
        .eq("user_id", user.id),
      supabaseAdmin.from("beverages")
        .select("name, purchase_price, selling_price, category")
        .eq("user_id", user.id),
      supabaseAdmin.from("profiles")
        .select("business_name, business_type, default_cmv")
        .eq("user_id", user.id)
        .single(),
    ]);

    const recipes = recipesRes.data || [];
    const beverages = beveragesRes.data || [];
    const profile = profileRes.data;

    if (recipes.length === 0) {
      return new Response(JSON.stringify({ error: "Cadastre fichas técnicas antes de usar esta funcionalidade." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const strategyDescriptions: Record<string, string> = {
      ancora_alta: "Posicione o item mais caro primeiro para criar um efeito de ancoragem. Os outros itens parecerão mais baratos em comparação.",
      produto_isca: "Coloque um produto extremamente atrativo no topo para gerar cliques e, em seguida, itens de maior margem.",
      combo_topo: "Destaque um combo lucrativo na primeira posição do cardápio, atraindo pedidos com ticket médio maior.",
      ticket_medio: "Organize os itens para incentivar pedidos com valores progressivos, aumentando o ticket médio.",
      anti_abandono: "Posicione os itens de forma a reduzir abandono de carrinho: preço crescente com alta atratividade nos primeiros itens.",
    };

    const allItems = [
      ...recipes.map(r => ({
        name: r.name,
        price: r.ifood_selling_price || r.selling_price || r.suggested_price || 0,
        cost: r.cost_per_serving || r.total_cost || 0,
        type: "prato",
      })),
      ...beverages.map(b => ({
        name: b.name,
        price: b.selling_price || 0,
        cost: b.purchase_price || 0,
        type: "bebida",
      })),
    ];

    const systemPrompt = `Você é um especialista em cardápios digitais para iFood e delivery no Brasil.

ESTRATÉGIA SELECIONADA: ${strategyDescriptions[strategyId] || strategyId}

CARDÁPIO COMPLETO DO NEGÓCIO:
${JSON.stringify(allItems, null, 2)}

TIPO DE NEGÓCIO: ${profile?.business_type || "restaurante"}

REGRAS:
1. Selecione exatamente 5 itens do cardápio para o topo
2. Use SOMENTE nomes de itens que existem no cardápio acima
3. Explique por que cada item está naquela posição
4. A explicação deve ser focada em conversão no iFood
5. Preços em R$ com 2 casas decimais`;

    const userPrompt = `Reorganize os 5 primeiros itens do cardápio usando a estratégia selecionada. Use a função organize_menu.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "organize_menu",
            description: "Organiza os 5 primeiros itens do cardápio com justificativa",
            parameters: {
              type: "object",
              properties: {
                strategy_name: { type: "string", description: "Nome curto da estratégia aplicada" },
                explanation: { type: "string", description: "Explicação da estratégia em 1-2 frases" },
                top_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      position: { type: "number" },
                      name: { type: "string" },
                      price: { type: "number" },
                      reason: { type: "string", description: "Por que este item está nesta posição (1 frase curta)" },
                    },
                    required: ["position", "name", "price", "reason"],
                    additionalProperties: false,
                  },
                },
                conversion_tip: { type: "string", description: "Explicação de por que essa organização converte melhor no iFood (2-3 frases)" },
              },
              required: ["strategy_name", "explanation", "top_items", "conversion_tip"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "organize_menu" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Erro ao gerar estratégia com IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    let strategyResult;
    try {
      strategyResult = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Erro ao processar resposta da IA");
    }

    // Log usage
    await supabaseAdmin.from("combo_generation_usage").insert({
      user_id: user.id,
      store_id: storeId || null,
      objective: `strategy_${strategyId}`,
      is_simulation: planInfo.current_plan === "free",
    });

    return new Response(
      JSON.stringify({
        strategy: strategyResult,
        usage: { used: (usageCount ?? 0) + 1, limit, plan: planInfo.current_plan },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-menu-strategy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
