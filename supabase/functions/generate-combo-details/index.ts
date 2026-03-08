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

    const { items, strategy, totalAvulso, suggestedPrice, savings } = await req.json();

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
      const ingredientsPart = i.ingredients?.length > 0 ? ` (ingredientes: ${i.ingredients.join(", ")})` : "";
      return `${i.quantity}x ${i.name}${ingredientsPart}`;
    }).join("\n");

    const systemPrompt = `Você é um especialista em naming e copywriting para cardápio de delivery/iFood no Brasil.
Sua tarefa é criar um NOME e uma DESCRIÇÃO comercial para um combo de delivery.

REGRAS:
1. Nome: curto (max 5 palavras), forte, chamativo, comercial. Pode usar emojis com moderação.
2. Descrição: max 2 frases curtas. Deve destacar conveniência, economia e apelo. Pronta para cardápio digital.
3. Use os ingredientes reais dos itens para enriquecer a descrição quando disponíveis.
4. Adapte o tom à estratégia escolhida.
5. Gere também uma lista de ingredientes do item principal para o campo ingredientsDescription.

ITENS DO COMBO:
${itemsList}

ESTRATÉGIA: ${strategyLabels[strategy] || strategy}
PREÇO AVULSO: R$ ${totalAvulso?.toFixed(2)}
PREÇO COMBO: R$ ${suggestedPrice?.toFixed(2)}
ECONOMIA: R$ ${savings?.toFixed(2)}`;

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
          { role: "user", content: "Gere o nome, descrição e ingredientes do combo. Use a função suggest_combo_details." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_combo_details",
              description: "Gera nome e descrição comercial do combo",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome comercial curto e chamativo" },
                  description: { type: "string", description: "Descrição vendedora, max 2 frases, pronta para iFood" },
                  ingredientsDescription: { type: "string", description: "Lista de ingredientes principais dos itens do combo" },
                },
                required: ["name", "description", "ingredientsDescription"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_combo_details" } },
      }),
    });

    if (!aiResponse.ok) {
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
