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

    const { items, strategy, totalAvulso, totalCost, minPriceNoLoss, suggestedPrice, aggressivePrice, savings, savingsPercent, estimatedProfit, estimatedMargin, baitItemName, profitDriverName } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Itens são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const strategyLabels: Record<string, string> = {
      ticket_medio: "Aumentar ticket médio",
      percepcao_vantagem: "Criar percepção de vantagem",
      dias_fracos: "Vender mais em dias fracos",
      combo_familia: "Criar combo família",
      item_isca: "Atrair com item isca",
      promo_controlada: "Promoção controlada",
    };

    const itemsList = items.map((i: any) => {
      const ingredientsPart = i.ingredients?.length > 0 ? ` (ingredientes reais da ficha técnica: ${i.ingredients.join(", ")})` : "";
      const costPart = i.cost != null ? ` | Custo: R$ ${Number(i.cost).toFixed(2)}` : "";
      const pricePart = i.price != null ? ` | Preço venda: R$ ${Number(i.price).toFixed(2)}` : "";
      const marginPart = i.margin != null ? ` | Margem: ${Number(i.margin).toFixed(0)}%` : "";
      return `- ${i.quantity}x ${i.name}${ingredientsPart}${costPart}${pricePart}${marginPart}`;
    }).join("\n");

    const strategyLabel = strategyLabels[strategy] || strategy;

    const systemPrompt = `Você é um especialista em precificação, engenharia de cardápio e estratégia de combos para delivery e iFood.

Analise os itens selecionados manualmente pelo usuário e use os dados reais vindos da ficha técnica e precificação do sistema.

OBJETIVOS:
- Calcular a lógica comercial do combo
- Identificar qual item sustenta o lucro
- Identificar qual item pode entrar com desconto ou preço de custo
- Sugerir preço final sem prejuízo
- Criar nome comercial
- Criar descrição curta, clara e vendedora

REGRAS OBRIGATÓRIAS:
1. Nunca sugerir preço com prejuízo.
2. Sempre considerar custo real dos itens.
3. Considerar a estratégia escolhida pelo usuário.
4. Explicar de forma simples quem entra com desconto e quem sustenta o lucro.
5. Criar nome comercial curto e forte (max 5 palavras). Pode usar emojis com moderação.
6. Criar descrição de no máximo 2 frases, pronta para cardápio digital/iFood.
7. Linguagem simples e pronta para uso em cardápio digital/iFood.
8. Não inventar ingredientes que não existam na ficha técnica.
9. Não exagerar na promessa comercial.
10. Sempre retornar resposta estruturada via a função generate_combo_analysis.

ITENS DO COMBO (dados reais do sistema):
${itemsList}

DADOS FINANCEIROS CALCULADOS PELO SISTEMA:
- Preço Avulso Total: R$ ${Number(totalAvulso || 0).toFixed(2)}
- Custo Total: R$ ${Number(totalCost || 0).toFixed(2)}
- Preço Mínimo Sem Prejuízo: R$ ${Number(minPriceNoLoss || 0).toFixed(2)}
- Preço Recomendado (Seguro): R$ ${Number(suggestedPrice || 0).toFixed(2)}
- Preço Agressivo: R$ ${Number(aggressivePrice || 0).toFixed(2)}
- Economia para o Cliente: R$ ${Number(savings || 0).toFixed(2)} (${Number(savingsPercent || 0).toFixed(0)}%)
- Lucro Estimado: R$ ${Number(estimatedProfit || 0).toFixed(2)}
- Margem Estimada: ${Number(estimatedMargin || 0).toFixed(1)}%
- Item Isca (menor margem): ${baitItemName || "Não identificado"}
- Item que Sustenta o Lucro (maior margem): ${profitDriverName || "Não identificado"}

ESTRATÉGIA ESCOLHIDA: ${strategyLabel}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise o combo montado pelo usuário com a estratégia "${strategyLabel}" e gere a análise completa usando a função generate_combo_analysis. Use os dados financeiros já calculados pelo sistema e foque em gerar nome, descrição e explicação estratégica de qualidade.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_combo_analysis",
              description: "Gera análise completa do combo com nome, descrição, estratégia e explicação",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome comercial curto e chamativo do combo (max 5 palavras)" },
                  description: { type: "string", description: "Descrição vendedora, max 2 frases, pronta para iFood/cardápio digital" },
                  ingredientsDescription: { type: "string", description: "Lista dos ingredientes reais do item principal do combo, baseada na ficha técnica" },
                  discountItemExplanation: { type: "string", description: "Explicação simples de qual item entra com desconto e por quê" },
                  profitItemExplanation: { type: "string", description: "Explicação simples de qual item sustenta o lucro do combo" },
                  strategyExplanation: { type: "string", description: "Explicação estratégica completa: por que essa montagem funciona para o objetivo escolhido, em 2-3 frases" },
                },
                required: ["name", "description", "ingredientsDescription", "discountItemExplanation", "profitItemExplanation", "strategyExplanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_combo_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error("Erro ao gerar detalhes com IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    const details = JSON.parse(toolCall.function.arguments);

    // Log usage
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabaseAdmin.from("strategic_usage_logs").insert({
      user_id: user.id,
      endpoint: "generate-combo-details",
      tokens_used: aiData.usage?.total_tokens || 0,
    });

    return new Response(JSON.stringify(details), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-combo-details error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
