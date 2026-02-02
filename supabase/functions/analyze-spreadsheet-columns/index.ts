import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnMapping {
  name: number | null;
  price: number | null;
  quantity: number | null;
  unit: number | null;
  correction_factor: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fallback to basic mapping
      return new Response(
        JSON.stringify({ mapping: guessBasicMapping(headers) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um assistente especializado em analisar cabeçalhos de planilhas de insumos/ingredientes de restaurantes.

Sua tarefa é mapear os cabeçalhos da planilha para os seguintes campos:
- name: Nome do insumo/produto/ingrediente
- price: Preço total ou valor de compra
- quantity: Quantidade ou volume
- unit: Unidade de medida
- correction_factor: Fator de correção (FC) ou perda

Retorne APENAS um JSON válido com os índices (0-based) das colunas correspondentes. Use null se não encontrar.

Exemplos de sinônimos para cada campo:
- name: "Produto", "Nome", "Descrição", "Insumo", "Matéria Prima", "Item", "Ingrediente"
- price: "Valor", "Preço", "Custo", "R$", "Valor Total", "Preço Total", "Valor Pago"
- quantity: "Quantidade", "Qtd", "Volume", "Peso", "Embalagem", "Qtde"
- unit: "Unidade", "Un", "Medida", "Un. Medida", "Und"
- correction_factor: "FC", "F.C", "Fator", "Correção", "Perda", "Fator de Correção"`;

    const userPrompt = `Analise estes cabeçalhos de planilha e retorne o mapeamento JSON:
${JSON.stringify(headers)}

Retorne APENAS o JSON no formato:
{"name": 0, "price": 1, "quantity": 2, "unit": 3, "correction_factor": null}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ mapping: guessBasicMapping(headers) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      try {
        const mapping = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({ mapping }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        console.error("Failed to parse AI response:", content);
      }
    }

    // Fallback to basic mapping
    return new Response(
      JSON.stringify({ mapping: guessBasicMapping(headers) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function guessBasicMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    price: null,
    quantity: null,
    unit: null,
    correction_factor: null,
  };

  const nameKeywords = ["nome", "produto", "insumo", "descrição", "matéria", "item", "ingrediente"];
  const priceKeywords = ["preço", "preco", "valor", "custo", "r$", "total"];
  const quantityKeywords = ["quantidade", "qtd", "qtde", "volume", "peso", "embalagem"];
  const unitKeywords = ["unidade", "un", "medida", "und"];
  const fcKeywords = ["fc", "f.c", "fator", "correção", "correcao", "perda"];

  headers.forEach((header, index) => {
    const h = header.toLowerCase();
    
    if (mapping.name === null && nameKeywords.some(k => h.includes(k))) {
      mapping.name = index;
    }
    if (mapping.price === null && priceKeywords.some(k => h.includes(k))) {
      mapping.price = index;
    }
    if (mapping.quantity === null && quantityKeywords.some(k => h.includes(k))) {
      mapping.quantity = index;
    }
    if (mapping.unit === null && unitKeywords.some(k => h.includes(k))) {
      mapping.unit = index;
    }
    if (mapping.correction_factor === null && fcKeywords.some(k => h.includes(k))) {
      mapping.correction_factor = index;
    }
  });

  return mapping;
}
