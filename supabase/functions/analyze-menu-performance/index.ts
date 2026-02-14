import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: userRL } = await supabase.rpc("check_rate_limit", {
      _key: user.id,
      _endpoint: "analyze-menu",
      _max_requests: 3,
      _window_seconds: 120,
      _block_seconds: 300,
    });
    const rl = userRL?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas análises. Aguarde alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retry_after_seconds) } }
      );
    }

    // Usage check
    const { data: usageCheck, error: usageError } = await supabase.rpc("check_and_increment_usage", {
      _user_id: user.id,
      _feature: "ifood_import",
      _endpoint: "analyze-menu-performance",
    });
    const usageInfo = usageCheck?.[0];
    if (usageError || !usageInfo?.allowed) {
      return new Response(
        JSON.stringify({
          error: usageInfo?.reason || "Funcionalidade não disponível no seu plano.",
          upgrade_required: true,
          current_plan: usageInfo?.current_plan || "free",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, storeName } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Itens do cardápio são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a concise menu summary for the AI
    const menuSummary = items.map((item: any) => 
      `- ${item.name} | ${item.category || "Sem categoria"} | R$ ${Number(item.price || 0).toFixed(2)}${item.description ? ` | ${item.description}` : ""}`
    ).join("\n");

    const systemPrompt = `Você é um consultor estratégico especialista em engenharia de cardápios para restaurantes e lanchonetes, com profundo conhecimento em psicologia de preço, ancoragem, engenharia de menu, comportamento do consumidor no iFood, estratégias de combo, aumento de ticket médio e maximização de margem.

Analise o cardápio fornecido e gere um JSON com a análise completa baseada nos 10 pilares abaixo (cada um valendo até 10 pontos):

1. Psicologia de Preço - Uso de valores quebrados, ausência de preços redondos, distribuição estratégica de faixas, percepção de valor
2. Ancoragem Estratégica - Produto âncora, produto intermediário valorizado, premium bem posicionado
3. Estratégia de Combos - Combos em destaque, economia percebida, combo casal/família, combo que empurra ticket
4. Potencial de Ticket Médio - Upsell, cross-sell, bebidas exploradas, adicionais lucrativos
5. Engenharia de Menu - Produto estrela identificado, produto problema, mix enxuto, excesso de itens
6. Estrutura e Organização - Ordem estratégica, combos primeiro, destaques claros, categorias divididas
7. Conversão no iFood - Primeira linha vendedora, nome chamativo, palavras sensoriais, rótulos como "Mais pedido"
8. Percepção de Valor - Cliente sente que ganha, economia clara nos combos, apresentação estratégica
9. Exploração de Bebidas e Extras - Bebidas com margem, molhos, upsell de tamanho
10. Potencial de Crescimento - Novos combos possíveis, produto sazonal, estratégia para aumentar ticket

Responda APENAS em JSON válido com esta estrutura exata:
{
  "pillars": [
    {
      "id": "price_psychology",
      "name": "Psicologia de Preço",
      "emoji": "🧠",
      "score": 7,
      "status": "Bom",
      "analysis": "Análise técnica detalhada...",
      "suggestions": ["Sugestão 1", "Sugestão 2"]
    }
  ],
  "totalScore": 72,
  "classification": "REGULAR",
  "classificationEmoji": "🟡",
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "improvements": ["Melhoria 1", "Melhoria 2"],
  "ticketOpportunities": ["Oportunidade 1", "Oportunidade 2"],
  "starProduct": "Nome do produto estrela",
  "anchorProduct": "Nome do produto âncora",
  "problemProduct": "Nome do produto problema",
  "rewrittenDescriptions": [
    { "original": "Nome do produto", "newDescription": "Nova descrição sensorial..." }
  ],
  "suggestedCombos": [
    { "name": "Nome do combo", "items": "Item 1 + Item 2", "strategy": "Por que funciona" }
  ],
  "priceAdjustments": [
    { "product": "Nome", "currentPrice": 25.00, "suggestedPrice": 24.90, "reason": "Motivo" }
  ]
}

Os IDs dos pilares devem ser exatamente: price_psychology, strategic_anchoring, combo_strategy, average_ticket, menu_engineering, structure_organization, ifood_conversion, value_perception, beverages_extras, growth_potential

O status de cada pilar deve ser: "Crítico" (0-3), "Fraco" (4-5), "Regular" (6-7), "Bom" (8), "Excelente" (9-10)

A classificação geral deve ser: "CRÍTICO" (0-39), "FRACO" (40-59), "REGULAR" (60-74), "BOM" (75-89), "ALTA PERFORMANCE" (90-100)`;

    const userPrompt = `Analise o cardápio da loja "${storeName || "Restaurante"}" com ${items.length} itens:

${menuSummary}

Gere a análise completa em JSON conforme o formato especificado. Seja estratégico e orientado a lucro.`;

    // Circuit breaker
    const { data: cbAllowed } = await supabase.rpc("check_global_ai_limit", { _endpoint: "analyze-menu-performance" });
    if (cbAllowed === false) {
      return new Response(JSON.stringify({ error: "Sistema de IA temporariamente indisponível." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro ao processar análise com IA");
    }

    const aiData = await aiResponse.json();
    const tokensUsed = aiData.usage?.total_tokens || 0;
    await supabase.from("strategic_usage_logs").insert({
      user_id: user.id,
      endpoint: "analyze-menu-performance",
      tokens_used: tokensUsed,
      ip_address: clientIp,
    });

    const aiContent = aiData.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(JSON.stringify({ error: "Erro ao interpretar análise da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-menu-performance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao analisar cardápio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
