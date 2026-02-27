import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Calculation Version ───
// Bump this when calculation logic changes. Historical data retains its original version.
const CALCULATION_VERSION = "recipe-pricing-v1";

// ─── Validation helpers ───

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function requirePositive(v: unknown, field: string): number {
  if (!isValidNumber(v) || v < 0)
    throw new ValidationError(`${field}: Este campo não pode conter valores negativos ou vazios.`);
  return v;
}

function requireStrictlyPositive(v: unknown, field: string): number {
  const n = requirePositive(v, field);
  if (n <= 0) throw new ValidationError(`${field}: Este campo deve ser maior que zero.`);
  return n;
}

function requirePercent(v: unknown, field: string, allowZero = true, allowHundred = false): number {
  if (!isValidNumber(v))
    throw new ValidationError(`${field}: O percentual informado está fora do intervalo permitido.`);
  if (v < 0 || (!allowHundred && v >= 100) || (allowHundred && v > 100))
    throw new ValidationError(`${field}: O percentual informado está fora do intervalo permitido (0–${allowHundred ? "100" : "99.99"}%).`);
  if (!allowZero && v === 0)
    throw new ValidationError(`${field}: O percentual deve ser maior que zero.`);
  return v;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class AntifraudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AntifraudError";
  }
}

// ─── Unit conversion (mirroring lib/ingredient-utils) ───

function convertToBaseUnit(quantity: number, fromUnit: string, toUnit: string): number {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  if (from === to) return quantity;
  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "mg" && to === "kg") return quantity / 1_000_000;
  if (from === "mg" && to === "g") return quantity / 1000;
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;
  return quantity;
}

function calculateIngredientCost(unitPrice: number, qty: number, qtyUnit: string, baseUnit: string): number {
  return unitPrice * convertToBaseUnit(qty, qtyUnit, baseUnit);
}

// ─── Types ───

interface IngredientInput {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

interface RequestBody {
  recipe_id?: string; // for update
  ingredients: IngredientInput[];
  servings: number;
  cmv_target: number;
  selling_price?: number | null;
  ifood_selling_price?: number | null;
  loss_percent?: number;
  discount_percent?: number;
  local_ifood_rate?: number | null;
  recipe_name: string;
  store_id?: string | null;
  packaging_cost?: number;
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Rate Limiting: 20 req/min por usuário, 60 req/min por IP ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const [{ data: userRL }, { data: ipRL }] = await Promise.all([
      supabase.rpc("check_rate_limit", { _key: user.id, _endpoint: "recipe-pricing", _max_requests: 20, _window_seconds: 60, _block_seconds: 120 }),
      supabase.rpc("check_rate_limit", { _key: `ip:${clientIp}`, _endpoint: "recipe-pricing", _max_requests: 60, _window_seconds: 60, _block_seconds: 120 }),
    ]);

    const rl = userRL?.[0] || ipRL?.[0];
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retry_after_seconds) },
      });
    }

    const rawBody = await req.json();

    // ─── MASS ASSIGNMENT PROTECTION: Only allow whitelisted fields ───
    const ALLOWED_FIELDS = [
      'recipe_id', 'ingredients', 'servings', 'cmv_target',
      'selling_price', 'ifood_selling_price', 'loss_percent',
      'discount_percent', 'local_ifood_rate', 'recipe_name', 'store_id',
      'packaging_cost',
    ];
    const body: RequestBody = {} as RequestBody;
    for (const key of ALLOWED_FIELDS) {
      if (key in rawBody) {
        (body as any)[key] = rawBody[key];
      }
    }

    // ─── FEATURE FLAG: Check plan allows advanced_pricing features ───
    if (body.loss_percent || body.discount_percent || body.local_ifood_rate) {
      const { data: featureCheck } = await supabase.rpc("check_plan_feature", {
        _user_id: user.id,
        _feature: "advanced_pricing",
      });
      const ff = featureCheck?.[0];
      if (ff && !ff.allowed) {
        return new Response(JSON.stringify({ error: ff.reason, upgrade_required: true, current_plan: ff.current_plan }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── RBAC: Validate store access ───
    if (body.store_id) {
      const { data: storeRole } = await supabase.rpc("get_store_role", {
        _user_id: user.id,
        _store_id: body.store_id,
      });

      if (!storeRole) {
        return new Response(JSON.stringify({ error: "Você não tem acesso a esta loja." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (storeRole === "viewer") {
        // Viewers can calculate pricing (read-only operation) but we flag it
        // Pricing calculation is read-only so viewers are allowed
      }
    }

    // ─── 1. Input validation ───

    if (!body.recipe_name || typeof body.recipe_name !== "string" || body.recipe_name.trim().length === 0) {
      throw new ValidationError("Nome da receita é obrigatório.");
    }
    if (body.recipe_name.trim().length > 200) {
      throw new ValidationError("Nome da receita deve ter no máximo 200 caracteres.");
    }

    const servings = requireStrictlyPositive(body.servings, "Porções");
    if (!Number.isInteger(servings)) throw new ValidationError("Porções deve ser um número inteiro.");

    const cmvTarget = requirePercent(body.cmv_target, "CMV Desejado", false);

    const lossPercent = requirePercent(body.loss_percent ?? 0, "% Perda", true, true);
    const discountPercent = requirePercent(body.discount_percent ?? 0, "% Desconto", true, true);

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      throw new ValidationError("Adicione pelo menos um insumo à receita.");
    }

    // Validate each ingredient input
    for (const ing of body.ingredients) {
      if (!ing.ingredient_id || typeof ing.ingredient_id !== "string") {
        throw new ValidationError("Cada insumo deve ter um identificador válido.");
      }
      requireStrictlyPositive(ing.quantity, "Quantidade do insumo");
      if (!ing.unit || typeof ing.unit !== "string") {
        throw new ValidationError("Cada insumo deve ter uma unidade válida.");
      }
    }

    // Validate optional prices
    let sellingPrice: number | null = null;
    if (body.selling_price !== null && body.selling_price !== undefined) {
      sellingPrice = requirePositive(body.selling_price, "Preço de Venda");
      if (sellingPrice === 0) sellingPrice = null; // treat 0 as "not set"
    }

    let ifoodSellingPrice: number | null = null;
    if (body.ifood_selling_price !== null && body.ifood_selling_price !== undefined) {
      ifoodSellingPrice = requirePositive(body.ifood_selling_price, "Preço iFood");
      if (ifoodSellingPrice === 0) ifoodSellingPrice = null;
    }

    let localIfoodRate: number | null = null;
    if (body.local_ifood_rate !== null && body.local_ifood_rate !== undefined) {
      localIfoodRate = requirePercent(body.local_ifood_rate, "Taxa iFood local", true, false);
    }

    // ─── 2. Fetch server-side data ───

    // Fetch ingredient data from DB (server-side truth for prices)
    const ingredientIds = body.ingredients.map((i) => i.ingredient_id);
    const { data: dbIngredients, error: ingError } = await supabase
      .from("ingredients")
      .select("id, unit, unit_price, purchase_price, purchase_quantity, correction_factor")
      .eq("user_id", user.id)
      .in("id", ingredientIds);

    if (ingError) throw new Error("Erro ao buscar insumos: " + ingError.message);
    if (!dbIngredients || dbIngredients.length === 0) {
      throw new ValidationError("Nenhum insumo válido encontrado.");
    }

    // Map for fast lookup
    const ingredientMap = new Map(dbIngredients.map((i) => [i.id, i]));

    // Validate all requested ingredients exist and belong to user
    for (const inp of body.ingredients) {
      if (!ingredientMap.has(inp.ingredient_id)) {
        throw new ValidationError(`Insumo não encontrado ou não pertence ao seu cadastro.`);
      }
    }

    // Fetch profile for business config
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("monthly_revenue, ifood_real_percentage, default_cmv")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw new Error("Erro ao buscar perfil: " + profileError.message);

    const monthlyRevenue = profile?.monthly_revenue ? Number(profile.monthly_revenue) : null;
    const globalIfoodRate = profile?.ifood_real_percentage ? Number(profile.ifood_real_percentage) : null;

    // Fetch production costs (fixed + variable)
    const [{ data: fixedCosts }, { data: variableCosts }] = await Promise.all([
      supabase.from("fixed_costs").select("value_per_item").eq("user_id", user.id),
      supabase.from("variable_costs").select("value_per_item").eq("user_id", user.id),
    ]);

    const fixedCostsTotal = fixedCosts?.reduce((s, c) => s + Number(c.value_per_item), 0) || 0;
    const variableCostsTotal = variableCosts?.reduce((s, c) => s + Number(c.value_per_item), 0) || 0;
    const totalProductionCosts = fixedCostsTotal + variableCostsTotal;

    let productionCostsPercent: number | null = null;
    if (monthlyRevenue && monthlyRevenue > 0 && totalProductionCosts > 0) {
      productionCostsPercent = (totalProductionCosts / monthlyRevenue) * 100;
    } else if (totalProductionCosts === 0) {
      productionCostsPercent = 0;
    }

    // Fetch tax percentage
    const { data: taxData } = await supabase
      .from("business_taxes")
      .select("tax_percentage")
      .eq("user_id", user.id)
      .maybeSingle();

    const taxPercentage = taxData?.tax_percentage ? Number(taxData.tax_percentage) : 0;

    // Fetch average card fee
    const { data: cardFeesData } = await supabase
      .from("card_fees")
      .select("fee_percentage")
      .eq("user_id", user.id);

    let averageCardFee = 0;
    if (cardFeesData && cardFeesData.length > 0) {
      averageCardFee = cardFeesData.reduce((s: number, f: any) => s + Number(f.fee_percentage), 0) / cardFeesData.length;
    }

    // ─── 3. Server-side calculations ───

    // Calculate ingredient costs using server-side prices
    const calculatedIngredients: { ingredient_id: string; quantity: number; unit: string; cost: number }[] = [];
    let ingredientsCostTotal = 0;

    for (const inp of body.ingredients) {
      const dbIng = ingredientMap.get(inp.ingredient_id)!;
      const unitPrice = dbIng.unit_price ?? (dbIng.purchase_price / (dbIng.purchase_quantity || 1));

      if (!isValidNumber(unitPrice) || unitPrice < 0) {
        throw new ValidationError(`Preço unitário inválido para um insumo. Verifique o cadastro de insumos.`);
      }

      const cost = calculateIngredientCost(unitPrice, inp.quantity, inp.unit, dbIng.unit);

      if (!isValidNumber(cost)) {
        throw new AntifraudError("Detectamos uma inconsistência no cálculo de custo de insumo. Os valores não foram salvos.");
      }

      calculatedIngredients.push({
        ingredient_id: inp.ingredient_id,
        quantity: inp.quantity,
        unit: inp.unit,
        cost: parseFloat(cost.toFixed(2)),
      });

      ingredientsCostTotal += cost;
    }

    // Add packaging cost to total
    const packagingCost = requirePositive(body.packaging_cost ?? 0, "Custo embalagem");
    ingredientsCostTotal += packagingCost;

    // Per serving
    const ingredientsCostPerServing = ingredientsCostTotal / servings;

    // Loss
    const lossMultiplier = 1 + lossPercent / 100;
    const costWithLoss = ingredientsCostPerServing * lossMultiplier;

    // Suggested price (from CMV target)
    const suggestedPrice = cmvTarget > 0 && cmvTarget < 100
      ? costWithLoss / (cmvTarget / 100)
      : costWithLoss;

    // Final selling price
    const finalSellingPrice = sellingPrice && sellingPrice > 0 ? sellingPrice : suggestedPrice;

    // Actual CMV
    const actualCMV = finalSellingPrice > 0 ? (costWithLoss / finalSellingPrice) * 100 : 0;

    // Gross margins
    const grossMargin = finalSellingPrice - costWithLoss;
    const grossMarginPercent = finalSellingPrice > 0 ? (grossMargin / finalSellingPrice) * 100 : 0;

    // Discounted price
    const discountedPrice = finalSellingPrice * (1 - discountPercent / 100);

    // iFood calculations
    const effectiveIfoodRate = localIfoodRate ?? globalIfoodRate ?? 0;

    const suggestedIfoodPrice = effectiveIfoodRate > 0 && effectiveIfoodRate < 100
      ? suggestedPrice / (1 - effectiveIfoodRate / 100)
      : suggestedPrice;

    const calculatedIfoodPrice = effectiveIfoodRate > 0 && effectiveIfoodRate < 100
      ? finalSellingPrice / (1 - effectiveIfoodRate / 100)
      : finalSellingPrice;

    const ifoodPrice = ifoodSellingPrice && ifoodSellingPrice > 0 ? ifoodSellingPrice : calculatedIfoodPrice;

    // ─── Net Profit - LOJA ───
    const productionCostValue = finalSellingPrice * (productionCostsPercent || 0) / 100;
    const taxValue = finalSellingPrice * taxPercentage / 100;
    const cardFeeValueLoja = finalSellingPrice * averageCardFee / 100;
    const netProfitLoja = finalSellingPrice - costWithLoss - productionCostValue - taxValue - cardFeeValueLoja;
    const netProfitLojaPercent = finalSellingPrice > 0 ? (netProfitLoja / finalSellingPrice) * 100 : 0;

    // ─── Net Profit - IFOOD ───
    const ifoodFeeValue = ifoodPrice * (effectiveIfoodRate / 100);
    const ifoodNetRevenue = ifoodPrice - ifoodFeeValue;
    const ifoodProductionCost = ifoodNetRevenue * (productionCostsPercent || 0) / 100;
    const ifoodTaxValue = ifoodNetRevenue * taxPercentage / 100;
    const ifoodNetProfit = ifoodNetRevenue - costWithLoss - ifoodProductionCost - ifoodTaxValue;
    const ifoodNetProfitPercent = ifoodPrice > 0 ? (ifoodNetProfit / ifoodPrice) * 100 : 0;

    // ═══════════════════════════════════════════════════════════════
    // ─── FAIL-SAFE GATE: All outputs validated BEFORE response ───
    // If ANY calculated value is invalid (NaN, Infinity), abort entirely
    // No partial or auto-corrected data is ever returned
    // ═══════════════════════════════════════════════════════════════

    const allOutputs: Record<string, number> = {
      ingredientsCostTotal, ingredientsCostPerServing, costWithLoss,
      suggestedPrice, finalSellingPrice, actualCMV, grossMargin, grossMarginPercent,
      discountedPrice, ifoodPrice, netProfitLoja, netProfitLojaPercent,
      ifoodNetProfit, ifoodNetProfitPercent, ifoodFeeValue, ifoodNetRevenue,
      productionCostValue, taxValue, cardFeeValueLoja, suggestedIfoodPrice, calculatedIfoodPrice,
    };

    for (const [key, v] of Object.entries(allOutputs)) {
      if (!isValidNumber(v)) {
        console.error(`[FAIL-SAFE] Invalid output: ${key} = ${v}`);
        throw new AntifraudError("Detectamos uma inconsistência no cálculo. Nenhum valor foi salvo ou retornado.");
      }
    }

    // Logical consistency checks
    if (actualCMV > 100 && sellingPrice && sellingPrice > 0) {
      // CMV > 100% means cost exceeds selling price — warn but allow (user set the price)
    }

    // ─── 5. Build response ───

    const result = {
      // Ingredients (server-calculated costs)
      ingredients: calculatedIngredients,

      // Core costs
      ingredients_cost_total: parseFloat(ingredientsCostTotal.toFixed(2)),
      ingredients_cost_per_serving: parseFloat(ingredientsCostPerServing.toFixed(2)),
      cost_with_loss: parseFloat(costWithLoss.toFixed(2)),
      loss_multiplier: lossMultiplier,

      // Pricing
      suggested_price: parseFloat(suggestedPrice.toFixed(2)),
      final_selling_price: parseFloat(finalSellingPrice.toFixed(2)),
      selling_price_is_manual: sellingPrice !== null && sellingPrice > 0,

      // CMV
      cmv_target: cmvTarget,
      actual_cmv: parseFloat(actualCMV.toFixed(2)),

      // Margins
      gross_margin: parseFloat(grossMargin.toFixed(2)),
      gross_margin_percent: parseFloat(grossMarginPercent.toFixed(2)),

      // Promotion
      discount_percent: discountPercent,
      discounted_price: parseFloat(discountedPrice.toFixed(2)),

      // iFood
      effective_ifood_rate: effectiveIfoodRate,
      suggested_ifood_price: parseFloat(suggestedIfoodPrice.toFixed(2)),
      calculated_ifood_price: parseFloat(calculatedIfoodPrice.toFixed(2)),
      ifood_price: parseFloat(ifoodPrice.toFixed(2)),
      ifood_price_is_manual: ifoodSellingPrice !== null && ifoodSellingPrice > 0,

      // Net Profit - Loja
      production_costs_percent: productionCostsPercent !== null ? parseFloat(productionCostsPercent.toFixed(2)) : null,
      tax_percentage: taxPercentage,
      average_card_fee: parseFloat(averageCardFee.toFixed(2)),
      card_fee_value_loja: parseFloat(cardFeeValueLoja.toFixed(2)),
      production_cost_value_loja: parseFloat(productionCostValue.toFixed(2)),
      tax_value_loja: parseFloat(taxValue.toFixed(2)),
      net_profit_loja: parseFloat(netProfitLoja.toFixed(2)),
      net_profit_loja_percent: parseFloat(netProfitLojaPercent.toFixed(2)),

      // Net Profit - iFood
      ifood_fee_value: parseFloat(ifoodFeeValue.toFixed(2)),
      ifood_net_revenue: parseFloat(ifoodNetRevenue.toFixed(2)),
      ifood_production_cost: parseFloat(ifoodProductionCost.toFixed(2)),
      ifood_tax_value: parseFloat(ifoodTaxValue.toFixed(2)),
      net_profit_ifood: parseFloat(ifoodNetProfit.toFixed(2)),
      net_profit_ifood_percent: parseFloat(ifoodNetProfitPercent.toFixed(2)),

      // Warnings
      warnings: [] as string[],

      // Version
      calculation_version: CALCULATION_VERSION,
    };

    if (actualCMV > 100 && sellingPrice && sellingPrice > 0) {
      result.warnings.push("Os custos informados são maiores que o preço de venda. O CMV está acima de 100%.");
    }
    if (netProfitLoja < 0) {
      result.warnings.push("O lucro líquido da loja está negativo. Revise custos, taxas e preço de venda.");
    }
    if (ifoodNetProfit < 0 && effectiveIfoodRate > 0) {
      result.warnings.push("O lucro líquido no iFood está negativo. Revise o preço ou a taxa iFood.");
    }

    // ─── Save calculation history (immutable) ───
    await supabase.from("calculation_history").insert({
      user_id: user.id,
      store_id: body.store_id || null,
      entity_type: "recipe_pricing",
      entity_id: body.recipe_id || null,
      calculation_version: CALCULATION_VERSION,
      input_snapshot: {
        ingredients: body.ingredients,
        servings,
        cmv_target: cmvTarget,
        selling_price: sellingPrice,
        ifood_selling_price: ifoodSellingPrice,
        loss_percent: lossPercent,
        discount_percent: discountPercent,
        local_ifood_rate: localIfoodRate,
        packaging_cost: packagingCost,
        global_ifood_rate: globalIfoodRate,
        production_costs_percent: productionCostsPercent,
        tax_percentage: taxPercentage,
        average_card_fee: averageCardFee,
      },
      output_snapshot: result,
    }).then(({ error }) => {
      if (error) console.error("[VERSION] Failed to save calculation history:", error);
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const isValidation = err instanceof ValidationError;
    const isAntifraud = err instanceof AntifraudError;
    const status = isValidation ? 400 : isAntifraud ? 422 : 500;
    const message = isValidation || isAntifraud
      ? err.message
      : "Não foi possível calcular a precificação com os dados informados. Verifique seus custos e taxas.";

    console.error("calculate-recipe-pricing error:", err);

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
