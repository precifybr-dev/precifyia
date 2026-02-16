import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedItem {
  name: string;
  description?: string;
  category?: string;
}

interface FullMenuItem {
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
}

// ─── Brazilian city coordinates for iFood API ───
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "sao-paulo-sp": { lat: -23.5505, lng: -46.6333 },
  "rio-de-janeiro-rj": { lat: -22.9068, lng: -43.1729 },
  "belo-horizonte-mg": { lat: -19.9167, lng: -43.9345 },
  "curitiba-pr": { lat: -25.4284, lng: -49.2733 },
  "porto-alegre-rs": { lat: -30.0346, lng: -51.2177 },
  "brasilia-df": { lat: -15.7801, lng: -47.9292 },
  "salvador-ba": { lat: -12.9714, lng: -38.5124 },
  "fortaleza-ce": { lat: -3.7172, lng: -38.5433 },
  "recife-pe": { lat: -8.0476, lng: -34.8770 },
  "goiania-go": { lat: -16.6869, lng: -49.2648 },
  "campinas-sp": { lat: -22.9099, lng: -47.0626 },
  "manaus-am": { lat: -3.1190, lng: -60.0217 },
  "florianopolis-sc": { lat: -27.5954, lng: -48.5480 },
  "vitoria-es": { lat: -20.3155, lng: -40.3128 },
  "natal-rn": { lat: -5.7945, lng: -35.2110 },
  "campo-grande-ms": { lat: -20.4697, lng: -54.6201 },
  "joao-pessoa-pb": { lat: -7.1195, lng: -34.8450 },
  "sao-luis-ma": { lat: -2.5297, lng: -44.2825 },
  "maceio-al": { lat: -9.6658, lng: -35.7353 },
  "teresina-pi": { lat: -5.0892, lng: -42.8019 },
  "uberlandia-mg": { lat: -18.9186, lng: -48.2772 },
  "ribeirao-preto-sp": { lat: -21.1704, lng: -47.8103 },
  "sorocaba-sp": { lat: -23.5015, lng: -47.4526 },
  "santos-sp": { lat: -23.9608, lng: -46.3336 },
  "guarulhos-sp": { lat: -23.4543, lng: -46.5337 },
  "osasco-sp": { lat: -23.5325, lng: -46.7917 },
  "santo-andre-sp": { lat: -23.6737, lng: -46.5432 },
  "sao-bernardo-do-campo-sp": { lat: -23.6914, lng: -46.5646 },
  "niteroi-rj": { lat: -22.8833, lng: -43.1036 },
  "londrina-pr": { lat: -23.3103, lng: -51.1628 },
  "joinville-sc": { lat: -26.3045, lng: -48.8487 },
  "juiz-de-fora-mg": { lat: -21.7642, lng: -43.3503 },
  "cuiaba-mt": { lat: -15.6014, lng: -56.0979 },
  "aracaju-se": { lat: -10.9091, lng: -37.0677 },
  "belém-pa": { lat: -1.4558, lng: -48.5024 },
  "belem-pa": { lat: -1.4558, lng: -48.5024 },
  "maringa-pr": { lat: -23.4205, lng: -51.9333 },
};

function getCityCoordinates(citySlug: string): { lat: number; lng: number } {
  // Try exact match
  if (CITY_COORDINATES[citySlug]) return CITY_COORDINATES[citySlug];
  // Try partial match
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (citySlug.startsWith(key.split("-")[0])) return coords;
  }
  // Default to São Paulo
  return { lat: -23.5505, lng: -46.6333 };
}

// ─── Strategy 1: iFood Marketplace API ───
async function fetchFromMarketplaceAPI(
  merchantId: string,
  lat: number,
  lng: number
): Promise<{ storeName: string; items: FullMenuItem[] } | null> {
  const endpoints = [
    `https://marketplace.ifood.com.br/v1/merchants/${merchantId}/catalog?latitude=${lat}&longitude=${lng}`,
    `https://marketplace.ifood.com.br/v2/merchants/${merchantId}?latitude=${lat}&longitude=${lng}&channel=IFOOD`,
    `https://wm.ifood.com.br/v1/merchant/${merchantId}/catalog?latitude=${lat}&longitude=${lng}`,
  ];

  for (const url of endpoints) {
    try {
      console.log("Trying marketplace API:", url);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Origin": "https://www.ifood.com.br",
          "Referer": "https://www.ifood.com.br/",
          "platform": "Desktop",
          "app_version": "9.0.0",
        },
      });

      if (!response.ok) {
        console.log(`Marketplace API ${url} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log("Marketplace API response keys:", Object.keys(data));

      // Try to extract menu from various response structures
      const result = parseMarketplaceResponse(data);
      if (result && result.items.length > 0) {
        console.log(`Extracted ${result.items.length} items from marketplace API`);
        return result;
      }
    } catch (e) {
      console.log(`Marketplace API failed for ${url}:`, e.message);
    }
  }

  return null;
}

function parseMarketplaceResponse(data: any): { storeName: string; items: FullMenuItem[] } | null {
  const items: FullMenuItem[] = [];
  let storeName = "";

  // Structure 1: { menu: [...categories] }
  const menu = data?.menu || data?.catalog?.menu || data?.data?.menu;
  const details = data?.details || data?.merchant || data?.data?.merchant || data;

  storeName = details?.name || details?.companyName || details?.tradingName || "";

  if (Array.isArray(menu)) {
    for (const category of menu) {
      const catName = category.name || category.title || category.categoryName || "Outros";
      const catItems = category.itens || category.items || category.products || [];

      for (const item of catItems) {
        let price = item.unitPrice ?? item.price ?? item.unitOriginalPrice ?? item.unitMinPrice ?? 0;
        if (typeof price === "number" && price > 1000) price = price / 100;

        items.push({
          name: item.description || item.name || item.title || "Item sem nome",
          description: item.details || item.subtitle || item.additionalInfo || "",
          price: typeof price === "number" ? price : parseFloat(String(price)) || 0,
          category: catName,
          image_url: item.logoUrl || item.imageUrl || item.image || "",
        });
      }
    }
  }

  // Structure 2: { categories: [...] }
  const categories = data?.categories || data?.catalog?.categories;
  if (!items.length && Array.isArray(categories)) {
    for (const category of categories) {
      const catName = category.name || "Outros";
      const catItems = category.items || category.itens || category.products || [];

      for (const item of catItems) {
        let price = item.unitPrice ?? item.price ?? item.originalPrice ?? 0;
        if (typeof price === "number" && price > 1000) price = price / 100;

        items.push({
          name: item.description || item.name || "Item sem nome",
          description: item.details || item.subtitle || "",
          price: typeof price === "number" ? price : parseFloat(String(price)) || 0,
          category: catName,
          image_url: item.logoUrl || item.imageUrl || "",
        });
      }
    }
  }

  // Structure 3: flat items array
  if (!items.length && Array.isArray(data?.items)) {
    for (const item of data.items) {
      let price = item.unitPrice ?? item.price ?? 0;
      if (typeof price === "number" && price > 1000) price = price / 100;

      items.push({
        name: item.description || item.name || "Item sem nome",
        description: item.details || "",
        price: typeof price === "number" ? price : parseFloat(String(price)) || 0,
        category: item.category || "Outros",
        image_url: item.logoUrl || item.imageUrl || "",
      });
    }
  }

  if (items.length > 0) return { storeName, items };
  return null;
}

// ─── Strategy 2: Parse embedded JSON from HTML page ───
function extractFromPageHTML(pageContent: string): { storeName: string; items: FullMenuItem[] } | null {
  // Sub-strategy A: __NEXT_DATA__ script tag
  const nextDataMatch = pageContent.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const result = extractFromNextData(nextData);
      if (result && result.items.length > 0) return result;
    } catch (e) {
      console.error("Failed to parse __NEXT_DATA__:", e);
    }
  }

  // Sub-strategy B: application/json script tags
  const jsonScriptMatches = [...pageContent.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonScriptMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      const result = extractFromNextData(jsonData);
      if (result && result.items.length > 0) return result;
    } catch (e) {
      // Try next
    }
  }

  // Sub-strategy C: inline state patterns
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});/,
    /"initialState"\s*:\s*(\{[\s\S]*?"menu"[\s\S]*?\})\s*[,}]/,
  ];
  for (const pattern of statePatterns) {
    const match = pageContent.match(pattern);
    if (match) {
      try {
        const stateData = JSON.parse(match[1]);
        const result = extractFromNextData(stateData);
        if (result && result.items.length > 0) return result;
      } catch (e) {
        // Continue
      }
    }
  }

  return null;
}

function extractFromNextData(data: any): { storeName: string; items: FullMenuItem[] } | null {
  const paths = [
    () => data?.props?.initialState?.restaurant,
    () => data?.props?.pageProps?.restaurant,
    () => data?.props?.pageProps?.content?.restaurant,
    () => data?.initialState?.restaurant,
    () => data?.restaurant,
    () => data?.props?.pageProps,
  ];

  for (const pathFn of paths) {
    try {
      const restaurant = pathFn();
      if (!restaurant) continue;

      const menu = restaurant.menu || restaurant.catalog?.menu || restaurant.categories;
      const details = restaurant.details || restaurant.header || restaurant;

      if (!menu || !Array.isArray(menu)) continue;

      const storeName = details?.name || details?.title || details?.storeName || "";
      const items: FullMenuItem[] = [];

      for (const category of menu) {
        const catName = category.name || category.title || category.categoryName || "Outros";
        const catItems = category.itens || category.items || category.products || [];

        for (const item of catItems) {
          let price = item.unitPrice ?? item.price ?? item.unitOriginalPrice ?? item.unitMinPrice ?? 0;
          if (typeof price === "number" && price > 1000) price = price / 100;

          items.push({
            name: item.description || item.name || item.title || "Item sem nome",
            description: item.details || item.subtitle || item.additionalInfo || "",
            price: typeof price === "number" ? price : parseFloat(String(price)) || 0,
            category: catName,
            image_url: item.logoUrl || item.imageUrl || item.image || "",
          });
        }
      }

      if (items.length > 0) return { storeName, items };
    } catch (e) {
      continue;
    }
  }

  return null;
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

    // ─── Rate Limiting ───
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

    // ─── Atomic Usage Check ───
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

    // ─── Shadow Ban Check ───
    const { data: riskFlag } = await supabase
      .from("risk_flags")
      .select("shadow_banned")
      .eq("user_id", user.id)
      .maybeSingle();
    const isShadowBanned = riskFlag?.shadow_banned === true;

    const rawBody = await req.json();

    const ifoodUrl = typeof rawBody.ifoodUrl === 'string' ? rawBody.ifoodUrl.trim() : null;
    const importType = typeof rawBody.importType === 'string' ? rawBody.importType : 'ingredients';

    if (!ifoodUrl) {
      return new Response(
        JSON.stringify({ error: "URL do iFood é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlPattern = /ifood\.com\.br/i;
    if (!urlPattern.test(ifoodUrl)) {
      return new Response(
        JSON.stringify({ error: "URL inválida. Use um link válido do iFood." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlParts = ifoodUrl.match(/\/delivery\/([^\/]+)\/([^\/]+)\/([a-f0-9-]+)/i);

    let citySlug: string | null = null;
    let storeSlug: string | null = null;
    let merchantId: string | null = null;

    if (urlParts) {
      citySlug = urlParts[1];
      storeSlug = urlParts[2];
      merchantId = urlParts[3];
    } else {
      const simpleMatch = ifoodUrl.match(/\/delivery\/([^\/]+)\/([^\/\?]+)/i);
      if (simpleMatch) {
        citySlug = simpleMatch[1];
        storeSlug = simpleMatch[2];
      } else {
        const fallback = ifoodUrl.match(/ifood\.com\.br\/([^\/\?]+)/i);
        storeSlug = fallback ? fallback[1] : null;
      }
    }

    if (!storeSlug) {
      return new Response(
        JSON.stringify({ error: "Não foi possível identificar a loja no link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let storeName = storeSlug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const coords = getCityCoordinates(citySlug || "sao-paulo-sp");

    // ─── Full Menu Mode (Direct extraction, NO AI) ───
    if (importType === "full_menu") {
      const storeIdParam = rawBody.storeId as string | undefined;

      let extractedItems: FullMenuItem[] = [];
      let extractedStoreName = storeName;

      // ── Strategy 1: iFood Marketplace API (if we have merchant UUID) ──
      if (merchantId && !isShadowBanned) {
        console.log(`Strategy 1: Marketplace API for merchant ${merchantId} at ${coords.lat},${coords.lng}`);
        const apiResult = await fetchFromMarketplaceAPI(merchantId, coords.lat, coords.lng);
        if (apiResult) {
          extractedItems = apiResult.items;
          extractedStoreName = apiResult.storeName || extractedStoreName;
          console.log(`Strategy 1 SUCCESS: ${extractedItems.length} items`);
        }
      }

      // ── Strategy 2: Fetch HTML page and parse embedded JSON ──
      if (extractedItems.length === 0) {
        console.log("Strategy 2: Fetching HTML page...");
        try {
          const response = await fetch(ifoodUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
              "Accept-Encoding": "gzip, deflate, br",
              "Cache-Control": "no-cache",
              "Sec-Ch-Ua": '"Chromium";v="125", "Not=A?Brand";v="8"',
              "Sec-Ch-Ua-Mobile": "?0",
              "Sec-Ch-Ua-Platform": '"Windows"',
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Sec-Fetch-User": "?1",
              "Upgrade-Insecure-Requests": "1",
              "Cookie": `location={"lat":${coords.lat},"lng":${coords.lng},"address":"","city":"","neighborhood":"","state":"","country":"BR","zipCode":""}`,
            },
            redirect: "follow",
          });

          if (response.ok) {
            const pageContent = await response.text();
            console.log(`Strategy 2: Got HTML, length: ${pageContent.length}`);

            // Try title extraction
            const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
              const title = titleMatch[1].replace(/ - iFood/i, "").replace(/\| iFood/i, "").trim();
              if (title && title.length > 2 && !title.toLowerCase().includes("ifood")) {
                extractedStoreName = title;
              }
            }

            const htmlResult = extractFromPageHTML(pageContent);
            if (htmlResult) {
              extractedItems = htmlResult.items;
              if (htmlResult.storeName) extractedStoreName = htmlResult.storeName;
              console.log(`Strategy 2 SUCCESS: ${extractedItems.length} items`);
            } else {
              console.log("Strategy 2: No JSON data found in HTML");
              // Log a sample of HTML for debugging
              const scriptTags = pageContent.match(/<script[^>]*>/gi) || [];
              console.log(`Strategy 2: Found ${scriptTags.length} script tags`);
              const hasNextData = pageContent.includes("__NEXT_DATA__");
              const hasAppJson = pageContent.includes('application/json');
              console.log(`Strategy 2: __NEXT_DATA__=${hasNextData}, application/json=${hasAppJson}`);
            }
          }
        } catch (fetchError) {
          console.error("Strategy 2 failed:", fetchError);
        }
      }

      // ── Strategy 3: Try iFood's Next.js data endpoint ──
      if (extractedItems.length === 0 && merchantId && citySlug && storeSlug) {
        console.log("Strategy 3: Trying Next.js data endpoint...");
        try {
          // iFood Next.js pages sometimes expose data via _next/data
          const nextDataUrl = `https://www.ifood.com.br/delivery/${citySlug}/${storeSlug}/${merchantId}`;
          const response = await fetch(nextDataUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
              "Accept": "application/json, text/plain, */*",
              "Accept-Language": "pt-BR,pt;q=0.9",
              "X-Requested-With": "XMLHttpRequest",
              "Cookie": `location={"lat":${coords.lat},"lng":${coords.lng}}`,
            },
          });

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const jsonData = await response.json();
              const result = extractFromNextData(jsonData);
              if (result && result.items.length > 0) {
                extractedItems = result.items;
                extractedStoreName = result.storeName || extractedStoreName;
                console.log(`Strategy 3 SUCCESS: ${extractedItems.length} items`);
              }
            } else {
              // It returned HTML, try parsing it
              const html = await response.text();
              const result = extractFromPageHTML(html);
              if (result && result.items.length > 0) {
                extractedItems = result.items;
                if (result.storeName) extractedStoreName = result.storeName;
                console.log(`Strategy 3 (HTML fallback) SUCCESS: ${extractedItems.length} items`);
              }
            }
          }
        } catch (e) {
          console.log("Strategy 3 failed:", e.message);
        }
      }

      // ── All strategies failed ──
      if (extractedItems.length === 0) {
        console.error("All extraction strategies failed for:", ifoodUrl);
        await supabase.from("strategic_usage_logs").insert({
          user_id: user.id,
          endpoint: "parse-ifood-menu-extraction-failed",
          tokens_used: 0,
          ip_address: clientIp,
        });

        return new Response(
          JSON.stringify({
            error: "Não foi possível extrair o cardápio automaticamente. O iFood pode ter alterado sua estrutura. Entre em contato com o suporte.",
            extraction_failed: true,
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Success: Save cache and return ──
      if (storeIdParam) {
        try {
          await supabase
            .from("stores")
            .update({
              menu_cache: { storeName: extractedStoreName, items: extractedItems },
              menu_cached_at: new Date().toISOString(),
            } as any)
            .eq("id", storeIdParam);
        } catch (cacheErr) {
          console.error("Failed to save menu cache:", cacheErr);
        }
      }

      await supabase.from("strategic_usage_logs").insert({
        user_id: user.id,
        endpoint: "parse-ifood-menu-full",
        tokens_used: 0,
        ip_address: clientIp,
      });

      return new Response(
        JSON.stringify({
          success: true,
          storeName: extractedStoreName,
          items: extractedItems.map((item, index) => ({
            name: item.name || "Item sem nome",
            description: item.description || "",
            price: typeof item.price === "number" ? item.price : parseFloat(String(item.price)) || 0,
            category: item.category || "Outros",
            image_url: item.image_url || "",
            position: index,
          })),
          importType: "full_menu",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Original ingredients/products mode (uses AI) ───
    let pageContent = "";
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
        const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1].replace(/ - iFood/i, "").replace(/\| iFood/i, "").trim();
          if (title) storeName = title;
        }
      }
    } catch (fetchError) {
      console.log("Could not fetch page directly");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = isShadowBanned
      ? `Você é um assistente. Liste 5 itens genéricos para um restaurante brasileiro.
Responda em JSON: { "storeName": "Loja", "items": [{ "name": "Item", "category": "Geral" }] }`
      : `Você é um especialista em cardápios de restaurantes brasileiros. 
Seu trabalho é analisar informações de lojas do iFood e extrair ou sugerir itens realistas.

Regras importantes:
1. Gere itens que façam sentido para o tipo de estabelecimento (ex: hamburgueria, pizzaria, etc.)
2. Para INSUMOS: extraia ingredientes mencionados nas descrições ou sugira insumos típicos do segmento
3. Para PRODUTOS/LANCHES: extraia os nomes dos pratos/itens do cardápio
4. Máximo de 15 itens por categoria
5. Nomes devem ser simples e diretos (ex: "Queijo Mussarela", "Hambúrguer Tradicional")
6. Responda APENAS em formato JSON válido, sem markdown`;

    const userPrompt = isShadowBanned
      ? `Liste itens para: "${storeName}". JSON: { "storeName": "...", "items": [{ "name": "...", "category": "..." }] }`
      : importType === "ingredients"
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

    const { data: cbAllowed } = await supabase.rpc("check_global_ai_limit", { _endpoint: "parse-ifood-menu" });
    if (cbAllowed === false) {
      await supabase.from("strategic_usage_logs").insert({ user_id: user.id, endpoint: "parse-ifood-menu-circuit-break", tokens_used: 0 });
      return new Response(JSON.stringify({ error: "Sistema de IA temporariamente indisponível. Tente novamente em alguns minutos." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isShadowBanned ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview",
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

    const tokensUsed = (aiData.usage?.total_tokens || aiData.usage?.completion_tokens || 0);
    await supabase.from("strategic_usage_logs").insert({
      user_id: user.id,
      endpoint: "parse-ifood-menu",
      tokens_used: tokensUsed,
      ip_address: clientIp,
      fingerprint_hash: null,
    });

    const aiContent = aiData.choices?.[0]?.message?.content || "";

    let parsedResult: { storeName: string; items: ParsedItem[] };
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
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
