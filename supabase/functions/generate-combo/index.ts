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

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Rate Limit Global ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const fingerprintHash = req.headers.get("x-fingerprint") || "";

    const { data: rlAllowed } = await supabaseAdmin.rpc("check_rate_limit_global", {
      p_user: user.id,
      p_ip: clientIp,
      p_fingerprint: fingerprintHash,
    });

    if (rlAllowed === false) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log usage for rate limit tracking
    await supabaseAdmin.from("rate_limit_global").insert({
      user_id: user.id,
      ip: clientIp,
      fingerprint_hash: fingerprintHash || null,
      endpoint: "generate-combo",
    });

    const { objective, storeId, selectedItemIds } = await req.json();

    if (!objective) {
      return new Response(JSON.stringify({ error: "Objetivo é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Atomic Usage Check (prevents race conditions) ───
    const { data: usageCheck, error: usageError } = await supabaseAdmin.rpc("check_and_increment_usage", {
      _user_id: user.id,
      _feature: "combos_ai",
      _endpoint: "generate-combo",
    });

    const usageInfo = usageCheck?.[0];
    if (usageError || !usageInfo?.allowed) {
      return new Response(
        JSON.stringify({
          error: usageInfo?.reason || "Funcionalidade não disponível no seu plano.",
          usage: Number(usageInfo?.current_usage || 0),
          limit: Number(usageInfo?.usage_limit || 0),
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isFree = usageInfo.current_plan === "free";

    // Fetch user data + combo memory for AI context
    const storeFilter = storeId ? { store_id: storeId } : {};

    const [recipesRes, beveragesRes, profileRes, comboHistoryRes] = await Promise.all([
      supabaseAdmin
        .from("recipes")
        .select("id, name, total_cost, cost_per_serving, selling_price, suggested_price, servings, cmv_target, ifood_selling_price")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("beverages")
        .select("id, name, purchase_price, selling_price, unit_price, category")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("profiles")
        .select("business_name, business_type, monthly_revenue, default_cmv")
        .eq("user_id", user.id)
        .single(),
      // Fetch last 10 combos as memory context
      supabaseAdmin
        .from("combos")
        .select("name, objective, combo_price, total_cost, margin_percent, strategy_explanation, created_at, combo_items(item_name, role, is_bait)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const recipes = recipesRes.data || [];
    const beverages = beveragesRes.data || [];
    const profile = profileRes.data;
    const comboHistory = comboHistoryRes.data || [];

    // Build memory context from past combos
    const memoryContext = comboHistory.length > 0
      ? comboHistory.map((c: any) => {
          const items = (c.combo_items || []).map((i: any) => `${i.item_name} (${i.role}${i.is_bait ? ', ISCA' : ''})`).join(', ');
          return `- "${c.name}" | Objetivo: ${c.objective} | Preço: R$${c.combo_price} | Margem: ${c.margin_percent}% | Itens: [${items}] | Data: ${c.created_at?.slice(0, 10)}`;
        }).join('\n')
      : "Nenhum combo criado anteriormente.";

    // Identify frequently used items
    const itemFrequency: Record<string, number> = {};
    comboHistory.forEach((c: any) => {
      (c.combo_items || []).forEach((i: any) => {
        itemFrequency[i.item_name] = (itemFrequency[i.item_name] || 0) + 1;
      });
    });
    const frequentItems = Object.entries(itemFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count}x)`)
      .join(', ');

    // Identify pattern of objectives
    const objectiveFrequency: Record<string, number> = {};
    comboHistory.forEach((c: any) => {
      objectiveFrequency[c.objective] = (objectiveFrequency[c.objective] || 0) + 1;
    });
    const topObjectives = Object.entries(objectiveFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([obj, count]) => `${obj} (${count}x)`)
      .join(', ');

    if (recipes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cadastre pelo menos 1 ficha técnica antes de gerar combos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt
    const objectiveDescriptions: Record<string, string> = {
      ticket_medio: "Aumentar o ticket médio dos clientes no delivery",
      conversao_ifood: "Melhorar a taxa de conversão no iFood, otimizando para mais vendas",
      produto_ancora: "Criar um produto âncora de referência no cardápio de delivery",
      dias_fracos: "Vender mais em dias fracos (segunda a quarta) no delivery",
      percepcao_vantagem: "Criar percepção de vantagem e economia para o cliente no delivery",
      girar_estoque: "Girar estoque de produtos com baixa saída via combos delivery",
      combo_familia: "Criar um combo família atrativo para grupos no delivery",
      teste_rapido: "Testar rapidamente uma combinação de produtos no delivery",
      teste_estrategico: "Teste estratégico rápido de combo para delivery",
    };

    const objectiveText = objectiveDescriptions[objective] || objective;

    // Filter items if manual selection was provided
    let filteredRecipes = recipes;
    let filteredBeverages = beverages;

    if (selectedItemIds && selectedItemIds.length > 0) {
      filteredRecipes = recipes.filter((r: any) => selectedItemIds.includes(r.id));
      filteredBeverages = beverages.filter((b: any) => selectedItemIds.includes(b.id));
    }

    const recipesContext = filteredRecipes.map((r: any) => ({
      name: r.name,
      cost: r.cost_per_serving ?? r.total_cost,
      sellingPrice: r.ifood_selling_price || r.selling_price || r.suggested_price,
      ifoodPrice: r.ifood_selling_price,
      servings: r.servings,
    }));

    const beveragesContext = filteredBeverages.map((b: any) => ({
      name: b.name,
      cost: b.purchase_price,
      sellingPrice: b.selling_price,
      category: b.category,
    }));

    const manualSelectionNote = selectedItemIds?.length > 0
      ? `\n\nIMPORTANTE: O usuário selecionou manualmente os itens abaixo. Use OBRIGATORIAMENTE estes itens no combo. Você pode reorganizá-los e definir papéis estratégicos.`
      : "";

    const systemPrompt = `Você é um especialista em engenharia de cardápio focado exclusivamente em DELIVERY e iFood no Brasil.

ANÁLISE OBRIGATÓRIA antes de sugerir:
1. Lista completa de produtos disponíveis (abaixo)
2. Custos individuais de cada item
3. Margem por item
4. Objetivo escolhido pelo usuário
5. Itens selecionados manualmente (se houver)

REGRAS OBRIGATÓRIAS:
1. NUNCA gerar combo com lucro negativo
2. Definir claramente o item isca (lucro zero ou mínimo) — ele atrai o cliente
3. Sempre priorizar margem combinada do combo (mínimo 15%)
4. Aplicar psicologia de cardápio:
   - Ancoragem: mostrar preço avulso somado alto vs preço combo baixo
   - Decoy effect: incluir item que torna o combo irresistível comparado à compra avulsa
   - Percepção de vantagem: o cliente DEVE sentir que está economizando
   - Economia visível: destacar o desconto real em R$
5. Estruturar preço pensando em taxa de marketplace (iFood cobra ~12-27%)
6. Linguagem simples, comercial e pronta para iFood
7. Máximo 2 frases na descrição — curta e chamativa
8. Preços em Reais (R$)
9. Identificar o produto carro-chefe (maior apelo comercial)
10. Identificar itens de maior margem para compor o lucro real
${manualSelectionNote}

DADOS DO NEGÓCIO:
- Tipo: ${profile?.business_type || "restaurante"}
- Nome: ${profile?.business_name || "Não informado"}
- Faturamento mensal: R$ ${profile?.monthly_revenue || "Não informado"}
- CMV alvo: ${profile?.default_cmv || 30}%

CARDÁPIO (fichas técnicas):
${JSON.stringify(recipesContext, null, 2)}

BEBIDAS DISPONÍVEIS:
${beveragesContext.length > 0 ? JSON.stringify(beveragesContext, null, 2) : "Nenhuma bebida cadastrada"}

OBJETIVO DO COMBO: ${objectiveText}

MEMÓRIA DE COMBOS ANTERIORES (NÃO REPITA combinações iguais):
${memoryContext}

ITENS MAIS FREQUENTES NOS COMBOS: ${frequentItems || "Nenhum padrão ainda"}
OBJETIVOS MAIS USADOS: ${topObjectives || "Nenhum padrão ainda"}

INSTRUÇÕES DE MEMÓRIA:
- NÃO repita a mesma combinação de itens de combos anteriores
- Se o usuário já usou muito um item, sugira ALTERNATIVAS ou novas combinações
- Evolua estrategicamente: se já fez combo de ticket médio, sugira abordagem diferente
- Identifique padrões e proponha evolução (ex: "Você já explorou ancoragem, agora tente decoy effect")

FORMATO DE SAÍDA OBRIGATÓRIO (use a função suggest_combo com TODOS os campos):
- NOME DO COMBO
- DESCRIÇÃO (max 2 frases)
- ITENS INCLUÍDOS (com papel estratégico de cada um)
- ITEM ISCA (identificado claramente)
- PREÇO AVULSO SOMADO
- PREÇO DO COMBO
- CUSTO TOTAL
- LUCRO ESTIMADO
- MARGEM %
- EXPLICAÇÃO ESTRATÉGICA (por que este combo converte melhor no delivery)`;

    const userPrompt = `Crie um combo inteligente para o objetivo: "${objectiveText}".

Responda OBRIGATORIAMENTE usando a função suggest_combo com TODOS os campos preenchidos.`;

    // ─── Circuit Breaker Global ───
    const { data: cbAllowed } = await supabaseAdmin.rpc("check_global_ai_limit", { _endpoint: "generate-combo" });
    if (cbAllowed === false) {
      await supabaseAdmin.from("strategic_usage_logs").insert({ user_id: user.id, endpoint: "generate-combo-circuit-break", tokens_used: 0 });
      return new Response(JSON.stringify({ error: "Sistema de IA temporariamente indisponível. Tente novamente em alguns minutos." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // Call Lovable AI with tool calling for structured output
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
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_combo",
              description: "Sugere um combo inteligente com análise financeira completa",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome comercial curto e chamativo do combo" },
                  description: { type: "string", description: "Descrição vendedora em no máximo 2 frases, pronta para cardápio digital" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item_name: { type: "string" },
                        item_type: { type: "string", enum: ["recipe", "beverage"] },
                        role: { type: "string", enum: ["main", "accompaniment", "beverage", "bait"] },
                        is_bait: { type: "boolean" },
                        individual_price: { type: "number" },
                        cost: { type: "number" },
                      },
                      required: ["item_name", "item_type", "role", "is_bait", "individual_price", "cost"],
                      additionalProperties: false,
                    },
                  },
                  individual_total_price: { type: "number", description: "Soma dos preços individuais" },
                  combo_price: { type: "number", description: "Preço final sugerido do combo" },
                  total_cost: { type: "number", description: "Custo total de todos os itens" },
                  estimated_profit: { type: "number", description: "Lucro estimado (combo_price - total_cost)" },
                  margin_percent: { type: "number", description: "Margem percentual do combo" },
                  strategy_explanation: { type: "string", description: "Explicação estratégica em 1 frase de por que este combo funciona para o objetivo" },
                },
                required: ["name", "description", "items", "individual_total_price", "combo_price", "total_cost", "estimated_profit", "margin_percent", "strategy_explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_combo" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Erro ao gerar combo com IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    let comboData;
    try {
      comboData = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Erro ao processar resposta da IA");
    }

    // Backend validation: ensure profit is not negative
    const validatedProfit = comboData.combo_price - comboData.total_cost;
    if (validatedProfit < 0) {
      // AI suggested negative profit — recalculate to ensure minimum 15% margin
      comboData.combo_price = Math.ceil(comboData.total_cost * 1.2 * 100) / 100;
      comboData.estimated_profit = comboData.combo_price - comboData.total_cost;
      comboData.margin_percent = ((comboData.estimated_profit / comboData.combo_price) * 100);
    } else {
      // Use validated values
      comboData.estimated_profit = validatedProfit;
      comboData.margin_percent = comboData.combo_price > 0
        ? (validatedProfit / comboData.combo_price) * 100
        : 0;
    }

    // Round financials
    comboData.combo_price = Math.round(comboData.combo_price * 100) / 100;
    comboData.total_cost = Math.round(comboData.total_cost * 100) / 100;
    comboData.estimated_profit = Math.round(comboData.estimated_profit * 100) / 100;
    comboData.margin_percent = Math.round(comboData.margin_percent * 100) / 100;
    comboData.individual_total_price = Math.round(comboData.individual_total_price * 100) / 100;

    // Save combo to database (draft status; free plan = simulation only)
    const { data: savedCombo, error: saveError } = await supabaseAdmin
      .from("combos")
      .insert({
        user_id: user.id,
        store_id: storeId || null,
        name: comboData.name,
        description: comboData.description,
        objective,
        status: isFree ? "simulation" : "draft",
        individual_total_price: comboData.individual_total_price,
        combo_price: comboData.combo_price,
        total_cost: comboData.total_cost,
        estimated_profit: comboData.estimated_profit,
        margin_percent: comboData.margin_percent,
        strategy_explanation: comboData.strategy_explanation,
        ai_raw_response: aiData,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Error saving combo:", saveError);
      throw new Error("Erro ao salvar combo");
    }

    // Save combo items
    if (comboData.items?.length > 0) {
      const itemsToInsert = comboData.items.map((item: any) => ({
        combo_id: savedCombo.id,
        item_type: item.item_type,
        item_name: item.item_name,
        individual_price: Math.round((item.individual_price || 0) * 100) / 100,
        cost: Math.round((item.cost || 0) * 100) / 100,
        role: item.role,
        is_bait: item.is_bait || false,
      }));

      await supabaseAdmin.from("combo_items").insert(itemsToInsert);
    }

    // Log combo linkage (atomic usage already tracked by check_and_increment_usage)
    await supabaseAdmin.from("combo_generation_usage").insert({
      user_id: user.id,
      store_id: storeId || null,
      combo_id: savedCombo.id,
      objective,
      is_simulation: isFree,
    });

    return new Response(
      JSON.stringify({
        combo: {
          id: savedCombo.id,
          ...comboData,
          status: isFree ? "simulation" : "draft",
          is_simulation: isFree,
        },
        usage: {
          used: Number(usageInfo.current_usage),
          limit: Number(usageInfo.usage_limit),
          plan: usageInfo.current_plan,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-combo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
