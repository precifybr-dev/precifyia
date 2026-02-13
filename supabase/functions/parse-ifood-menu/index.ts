import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedItem {
  name: string;
  description?: string;
  category?: string;
}

interface ParseResult {
  storeName: string;
  storeLogoUrl?: string;
  ingredients: ParsedItem[];
  products: ParsedItem[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── OWNERSHIP: Require authentication ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Rate Limiting: 5 req/min por usuário (importações são pesadas) ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [{ data: userRL }, { data: ipRL }] = await Promise.all([
      supabase.rpc("check_rate_limit", { _key: user.id, _endpoint: "parse-ifood", _max_requests: 5, _window_seconds: 60, _block_seconds: 180 }),
      supabase.rpc("check_rate_limit", { _key: `ip:${clientIp}`, _endpoint: "parse-ifood", _max_requests: 10, _window_seconds: 60, _block_seconds: 180 }),
    ]);
    const rl = userRL?.[0] || ipRL?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas importações. Aguarde alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retry_after_seconds) } }
      );
    }

    // ─── Atomic Usage Check (prevents race conditions) ───
    const { data: usageCheck, error: usageError } = await supabase.rpc("check_and_increment_usage", {
      _user_id: user.id,
      _feature: "ifood_import",
      _endpoint: "parse-ifood-menu",
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

    const rawBody = await req.json();

    // ─── MASS ASSIGNMENT PROTECTION: Only allow ifoodUrl and importType ───
    const ifoodUrl = typeof rawBody.ifoodUrl === 'string' ? rawBody.ifoodUrl.trim() : null;
    const importType = typeof rawBody.importType === 'string' ? rawBody.importType : 'ingredients';

    if (!ifoodUrl) {
      return new Response(
        JSON.stringify({ error: "URL do iFood é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate iFood URL
    const urlPattern = /ifood\.com\.br/i;
    if (!urlPattern.test(ifoodUrl)) {
      return new Response(
        JSON.stringify({ error: "URL inválida. Use um link válido do iFood." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract store info from URL
    // URL format: https://www.ifood.com.br/delivery/{city-state}/{store-slug}/{store-id}
    const urlParts = ifoodUrl.match(/\/delivery\/([^\/]+)\/([^\/]+)\/([a-f0-9-]+)/i);
    
    let storeSlug: string;
    let storeId: string | null = null;
    
    if (urlParts) {
      // Full URL with city, slug, and ID
      storeSlug = urlParts[2]; // store-slug (e.g., "lanches-parana-andorinha")
      storeId = urlParts[3];   // store-id (UUID)
    } else {
      // Fallback: try simpler patterns
      const simpleMatch = ifoodUrl.match(/\/delivery\/[^\/]+\/([^\/\?]+)/i) || 
                          ifoodUrl.match(/ifood\.com\.br\/([^\/\?]+)/i);
      storeSlug = simpleMatch ? simpleMatch[1] : null;
    }

    if (!storeSlug) {
      return new Response(
        JSON.stringify({ error: "Não foi possível identificar a loja no link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch iFood page to get store data
    let pageContent = "";
    let storeName = storeSlug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    try {
      const response = await fetch(ifoodUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      
      if (response.ok) {
        pageContent = await response.text();
        
        // Try to extract store name from page
        const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1].replace(/ - iFood/i, "").replace(/\| iFood/i, "").trim();
          if (title) storeName = title;
        }
      }
    } catch (fetchError) {
      console.log("Could not fetch page directly, using AI to generate realistic data based on store name");
    }

    // Use AI to extract or generate realistic ingredients/products based on store info
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em cardápios de restaurantes brasileiros. 
Seu trabalho é analisar informações de lojas do iFood e extrair ou sugerir itens realistas.

Regras importantes:
1. Gere itens que façam sentido para o tipo de estabelecimento (ex: hamburgueria, pizzaria, etc.)
2. Para INSUMOS: extraia ingredientes mencionados nas descrições ou sugira insumos típicos do segmento
3. Para PRODUTOS/LANCHES: extraia os nomes dos pratos/itens do cardápio
4. Máximo de 15 itens por categoria
5. Nomes devem ser simples e diretos (ex: "Queijo Mussarela", "Hambúrguer Tradicional")
6. Responda APENAS em formato JSON válido, sem markdown`;

    const userPrompt = importType === "ingredients" 
      ? `Analise esta loja do iFood: "${storeName}"
      
URL: ${ifoodUrl}
${pageContent ? `\nConteúdo da página (parcial):\n${pageContent.slice(0, 8000)}` : ""}

Extraia ou sugira INSUMOS (ingredientes) típicos para este tipo de estabelecimento.
Responda em JSON: { "storeName": "Nome da Loja", "items": [{ "name": "Nome do Insumo", "category": "Categoria" }] }`
      : `Analise esta loja do iFood: "${storeName}"
      
URL: ${ifoodUrl}
${pageContent ? `\nConteúdo da página (parcial):\n${pageContent.slice(0, 8000)}` : ""}

Extraia ou sugira PRODUTOS/LANCHES típicos para este tipo de estabelecimento.
Responda em JSON: { "storeName": "Nome da Loja", "items": [{ "name": "Nome do Produto", "category": "Categoria" }] }`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Limite de uso da IA atingido. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Erro ao processar com IA");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse AI response
    let parsedResult: { storeName: string; items: ParsedItem[] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Fallback with store name from URL
      parsedResult = {
        storeName: storeName,
        items: [],
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        storeName: parsedResult.storeName || storeName,
        items: parsedResult.items || [],
        importType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-ifood-menu error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro ao processar cardápio" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});