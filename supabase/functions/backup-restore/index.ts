import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_VERSION = "2.0.0";
const COMPATIBLE_VERSIONS = ["1.0.0", "2.0.0"];

// Whitelist of fields per table (input-only, no calculated fields)
const EXPORT_FIELDS: Record<string, string[]> = {
  ingredients: ["name", "unit", "purchase_price", "purchase_quantity", "correction_factor", "color", "code", "store_id"],
  recipes: ["name", "servings", "cmv_target", "selling_price", "ifood_selling_price", "store_id"],
  recipe_ingredients: ["ingredient_id", "quantity", "unit", "recipe_id"],
  sub_recipes: ["name", "unit", "yield_quantity", "store_id"],
  sub_recipe_ingredients: ["ingredient_id", "quantity", "unit", "sub_recipe_id"],
  beverages: ["name", "unit", "purchase_price", "purchase_quantity", "selling_price", "cmv_target", "category", "color", "code", "ifood_selling_price", "store_id"],
  combos: ["name", "description", "objective", "status", "store_id"],
  combo_items: ["item_name", "item_type", "combo_id", "role"],
  fixed_costs: ["name", "value_per_item", "store_id"],
  variable_costs: ["name", "value_per_item", "store_id"],
  fixed_expenses: ["name", "monthly_value", "store_id", "cost_type", "sharing_group_id", "shared_store_ids"],
  variable_expenses: ["name", "monthly_value", "store_id"],
  business_taxes: ["tax_regime", "tax_percentage", "notes", "store_id"],
  card_fees: ["payment_type", "fee_percentage", "notes", "store_id"],
  monthly_revenues: ["month", "year", "value", "store_id"],
  stores: ["name", "business_type", "is_default", "monthly_revenue", "default_cmv", "ifood_url"],
  cmv_periodos: ["mes", "ano", "modo", "estoque_inicial", "compras", "estoque_final", "ajustes", "cmv_calculado", "cmv_percentual", "faturamento_liquido", "meta_definida", "meta_automatica", "onboarding_concluido", "store_id"],
  cmv_categorias: ["categoria", "estoque_inicial", "compras", "estoque_final", "ajustes", "cmv_categoria", "cmv_percentual_categoria"],
  cost_allocations: ["store_id", "allocated_amount", "division_type", "reference_month", "total_stores"],
  topo_cardapio_simulacoes: ["estrategia_aplicada", "itens_simulados", "explicacao", "store_id"],
};

const PROFILE_FIELDS = [
  "business_name", "business_type", "default_cmv", "cost_limit_percent", "tax_regime",
  "ifood_plan_type", "ifood_base_rate", "ifood_real_percentage", "ifood_monthly_orders",
  "ifood_average_ticket", "ifood_has_delivery_fee", "ifood_delivery_fee",
  "ifood_delivery_absorber", "ifood_offers_coupon", "ifood_coupon_type",
  "ifood_coupon_value", "ifood_orders_with_coupon", "ifood_coupon_absorber",
];

function pick(obj: Record<string, any>, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) result[k] = obj[k];
  }
  return result;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleExport(supabaseAdmin: any, userId: string, storeId: string | null) {
  // Build filter
  const filter = (q: any) => {
    q = q.eq("user_id", userId);
    if (storeId) q = q.eq("store_id", storeId);
    return q;
  };

  // Fetch all tables
  const [
    { data: ingredients },
    { data: recipes },
    { data: subRecipes },
    { data: beverages },
    { data: combos },
    { data: fixedCosts },
    { data: variableCosts },
    { data: fixedExpenses },
    { data: variableExpenses },
    { data: businessTaxes },
    { data: cardFees },
    { data: monthlyRevenues },
    { data: profileData },
    { data: userStores },
    { data: cmvPeriodos },
  ] = await Promise.all([
    filter(supabaseAdmin.from("ingredients").select("*")).order("code"),
    filter(supabaseAdmin.from("recipes").select("*")).order("name"),
    filter(supabaseAdmin.from("sub_recipes").select("*")).order("name"),
    filter(supabaseAdmin.from("beverages").select("*")).order("name"),
    filter(supabaseAdmin.from("combos").select("*")).order("name"),
    filter(supabaseAdmin.from("fixed_costs").select("*")).order("name"),
    filter(supabaseAdmin.from("variable_costs").select("*")).order("name"),
    filter(supabaseAdmin.from("fixed_expenses").select("*")).order("name"),
    filter(supabaseAdmin.from("variable_expenses").select("*")).order("name"),
    filter(supabaseAdmin.from("business_taxes").select("*")),
    filter(supabaseAdmin.from("card_fees").select("*")),
    filter(supabaseAdmin.from("monthly_revenues").select("*")),
    supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("stores").select("*").eq("user_id", userId).order("is_default", { ascending: false }),
    supabaseAdmin.from("cmv_periodos").select("*").eq("user_id", userId).order("ano").order("mes"),
  ]);

  // Fetch relational tables
  const recipeIds = (recipes || []).map((r: any) => r.id);
  const subRecipeIds = (subRecipes || []).map((s: any) => s.id);
  const comboIds = (combos || []).map((c: any) => c.id);
  const cmvPeriodoIds = (cmvPeriodos || []).map((p: any) => p.id);

  // Collect sharing_group_ids from stores
  const sharingGroupIds = [...new Set(
    (userStores || []).map((s: any) => s.sharing_group_id).filter(Boolean)
  )];

  // Collect expense ids for cost_allocations
  const expenseIds = (fixedExpenses || []).map((e: any) => e.id);

  const [
    { data: recipeIngredients },
    { data: subRecipeIngredients },
    { data: comboItems },
    { data: cmvCategorias },
    { data: sharingGroups },
    { data: sharingGroupStores },
    { data: costAllocations },
    { data: topoSimulacoes },
  ] = await Promise.all([
    recipeIds.length > 0
      ? supabaseAdmin.from("recipe_ingredients").select("*").in("recipe_id", recipeIds)
      : Promise.resolve({ data: [] }),
    subRecipeIds.length > 0
      ? supabaseAdmin.from("sub_recipe_ingredients").select("*").in("sub_recipe_id", subRecipeIds)
      : Promise.resolve({ data: [] }),
    comboIds.length > 0
      ? supabaseAdmin.from("combo_items").select("*").in("combo_id", comboIds)
      : Promise.resolve({ data: [] }),
    cmvPeriodoIds.length > 0
      ? supabaseAdmin.from("cmv_categorias").select("*").in("periodo_id", cmvPeriodoIds)
      : Promise.resolve({ data: [] }),
    sharingGroupIds.length > 0
      ? supabaseAdmin.from("sharing_groups").select("*").in("id", sharingGroupIds)
      : Promise.resolve({ data: [] }),
    sharingGroupIds.length > 0
      ? supabaseAdmin.from("sharing_group_stores").select("*").in("sharing_group_id", sharingGroupIds)
      : Promise.resolve({ data: [] }),
    expenseIds.length > 0
      ? supabaseAdmin.from("cost_allocations").select("*").in("expense_id", expenseIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from("topo_cardapio_simulacoes").select("*").eq("user_id", userId)
      .then((r: any) => r).catch(() => ({ data: [] })),
  ]);

  // Build name maps for relational resolution
  const ingredientMap = new Map((ingredients || []).map((i: any) => [i.id, i.name]));
  const recipeMap = new Map((recipes || []).map((r: any) => [r.id, r.name]));
  const subRecipeMap = new Map((subRecipes || []).map((s: any) => [s.id, s.name]));
  const comboMap = new Map((combos || []).map((c: any) => [c.id, c.name]));
  const storeMap = new Map((userStores || []).map((s: any) => [s.id, s.name]));
  const expenseMap = new Map((fixedExpenses || []).map((e: any) => [e.id, e.name]));

  // Map relational data to names instead of IDs
  const mappedRecipeIngredients = (recipeIngredients || []).map((ri: any) => ({
    ingredient_name: ingredientMap.get(ri.ingredient_id) || "unknown",
    recipe_name: recipeMap.get(ri.recipe_id) || "unknown",
    quantity: ri.quantity,
    unit: ri.unit,
  }));

  const mappedSubRecipeIngredients = (subRecipeIngredients || []).map((si: any) => ({
    ingredient_name: ingredientMap.get(si.ingredient_id) || "unknown",
    sub_recipe_name: subRecipeMap.get(si.sub_recipe_id) || "unknown",
    quantity: si.quantity,
    unit: si.unit,
  }));

  const mappedComboItems = (comboItems || []).map((ci: any) => ({
    item_name: ci.item_name,
    item_type: ci.item_type,
    combo_name: comboMap.get(ci.combo_id) || "unknown",
    role: ci.role,
  }));

  // Map CMV categorias with periodo reference
  const periodoMap = new Map((cmvPeriodos || []).map((p: any) => [p.id, { mes: p.mes, ano: p.ano }]));
  const mappedCmvCategorias = (cmvCategorias || []).map((c: any) => {
    const periodo = periodoMap.get(c.periodo_id);
    return {
      ...pick(c, EXPORT_FIELDS.cmv_categorias),
      periodo_mes: periodo?.mes,
      periodo_ano: periodo?.ano,
    };
  });

  // Map cost_allocations with expense_name and store_name
  const mappedCostAllocations = (costAllocations || []).map((ca: any) => ({
    expense_name: expenseMap.get(ca.expense_id) || "unknown",
    store_name: storeMap.get(ca.store_id) || "unknown",
    allocated_amount: ca.allocated_amount,
    division_type: ca.division_type,
    reference_month: ca.reference_month,
    total_stores: ca.total_stores,
  }));

  // Map sharing_group_stores with store_name and group_name
  const groupMap = new Map((sharingGroups || []).map((g: any) => [g.id, g.name]));
  const mappedSharingGroupStores = (sharingGroupStores || []).map((sgs: any) => ({
    group_name: groupMap.get(sgs.sharing_group_id) || "unknown",
    store_name: storeMap.get(sgs.store_id) || "unknown",
  }));

  // Map fixed_expenses: replace sharing_group_id with group_name and store_id with store_name
  const mappedFixedExpenses = (fixedExpenses || []).map((fe: any) => {
    const exported = pick(fe, EXPORT_FIELDS.fixed_expenses);
    if (exported.sharing_group_id) {
      exported.sharing_group_name = groupMap.get(exported.sharing_group_id) || null;
      delete exported.sharing_group_id;
    }
    if (exported.shared_store_ids && Array.isArray(exported.shared_store_ids)) {
      exported.shared_store_names = exported.shared_store_ids.map((sid: string) => storeMap.get(sid) || "unknown");
      delete exported.shared_store_ids;
    }
    // Replace store_id with store_name for portability
    if (exported.store_id) {
      exported.store_name = storeMap.get(exported.store_id) || null;
      delete exported.store_id;
    }
    return exported;
  });

  // Map CMV periodos: replace store_id with store_name
  const mappedCmvPeriodos = (cmvPeriodos || []).map((p: any) => {
    const exported = pick(p, EXPORT_FIELDS.cmv_periodos);
    if (exported.store_id) {
      exported.store_name = storeMap.get(exported.store_id) || null;
      delete exported.store_id;
    }
    return exported;
  });

  // Get store name for header
  let storeName: string | null = null;
  if (storeId) {
    storeName = storeMap.get(storeId) || null;
  }

  const backup = {
    format: "precify-backup",
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    user_id: userId,
    store_id: storeId,
    store_name: storeName,
    data: {
      profile: profileData ? pick(profileData, PROFILE_FIELDS) : null,
      stores: (userStores || []).map((s: any) => pick(s, EXPORT_FIELDS.stores)),
      sharing_groups: (sharingGroups || []).map((g: any) => ({ name: g.name })),
      sharing_group_stores: mappedSharingGroupStores,
      ingredients: (ingredients || []).map((i: any) => pick(i, EXPORT_FIELDS.ingredients)),
      recipes: (recipes || []).map((r: any) => pick(r, EXPORT_FIELDS.recipes)),
      recipe_ingredients: mappedRecipeIngredients,
      sub_recipes: (subRecipes || []).map((s: any) => pick(s, EXPORT_FIELDS.sub_recipes)),
      sub_recipe_ingredients: mappedSubRecipeIngredients,
      beverages: (beverages || []).map((b: any) => pick(b, EXPORT_FIELDS.beverages)),
      combos: (combos || []).map((c: any) => pick(c, EXPORT_FIELDS.combos)),
      combo_items: mappedComboItems,
      fixed_costs: (fixedCosts || []).map((f: any) => pick(f, EXPORT_FIELDS.fixed_costs)),
      variable_costs: (variableCosts || []).map((v: any) => pick(v, EXPORT_FIELDS.variable_costs)),
      fixed_expenses: mappedFixedExpenses,
      variable_expenses: (variableExpenses || []).map((v: any) => pick(v, EXPORT_FIELDS.variable_expenses)),
      business_taxes: (businessTaxes || []).map((t: any) => pick(t, EXPORT_FIELDS.business_taxes)),
      card_fees: (cardFees || []).map((c: any) => pick(c, EXPORT_FIELDS.card_fees)),
      monthly_revenues: (monthlyRevenues || []).map((m: any) => pick(m, EXPORT_FIELDS.monthly_revenues)),
      cmv_periodos: mappedCmvPeriodos,
      cmv_categorias: mappedCmvCategorias,
      cost_allocations: mappedCostAllocations,
      topo_cardapio_simulacoes: (topoSimulacoes || []).map((t: any) => pick(t, EXPORT_FIELDS.topo_cardapio_simulacoes)),
    },
  };

  // Audit log
  await supabaseAdmin.from("data_audit_log").insert({
    user_id: userId,
    action: "backup_export",
    table_name: "all",
    record_id: storeId || userId,
    new_data: {
      schema_version: SCHEMA_VERSION,
      store_id: storeId,
      counts: {
        ingredients: backup.data.ingredients.length,
        recipes: backup.data.recipes.length,
        sub_recipes: backup.data.sub_recipes.length,
        beverages: backup.data.beverages.length,
        combos: backup.data.combos.length,
        stores: backup.data.stores.length,
        cmv_periodos: backup.data.cmv_periodos.length,
        cost_allocations: backup.data.cost_allocations.length,
      },
    },
  });

  return jsonResponse(backup);
}

async function handleImportPreview(body: any, userId: string) {
  // Validate structure
  if (!body || body.format !== "precify-backup") {
    return jsonResponse({ error: "Formato de arquivo inválido. Use um arquivo .precify-backup exportado pelo sistema." }, 400);
  }

  if (!COMPATIBLE_VERSIONS.includes(body.schema_version)) {
    return jsonResponse({
      error: `Versão incompatível. O arquivo usa a versão ${body.schema_version}, mas o sistema aceita ${COMPATIBLE_VERSIONS.join(", ")}.`,
    }, 400);
  }

  const data = body.data || {};
  const counts: Record<string, number> = {
    ingredients: (data.ingredients || []).length,
    recipes: (data.recipes || []).length,
    recipe_ingredients: (data.recipe_ingredients || []).length,
    sub_recipes: (data.sub_recipes || []).length,
    sub_recipe_ingredients: (data.sub_recipe_ingredients || []).length,
    beverages: (data.beverages || []).length,
    combos: (data.combos || []).length,
    combo_items: (data.combo_items || []).length,
    fixed_costs: (data.fixed_costs || []).length,
    variable_costs: (data.variable_costs || []).length,
    fixed_expenses: (data.fixed_expenses || []).length,
    variable_expenses: (data.variable_expenses || []).length,
    business_taxes: (data.business_taxes || []).length,
    card_fees: (data.card_fees || []).length,
    monthly_revenues: (data.monthly_revenues || []).length,
  };

  // v2.0.0 fields
  if (data.stores) counts.stores = data.stores.length;
  if (data.sharing_groups) counts.sharing_groups = data.sharing_groups.length;
  if (data.cmv_periodos) counts.cmv_periodos = data.cmv_periodos.length;
  if (data.cmv_categorias) counts.cmv_categorias = data.cmv_categorias.length;
  if (data.cost_allocations) counts.cost_allocations = data.cost_allocations.length;
  if (data.topo_cardapio_simulacoes) counts.topo_cardapio_simulacoes = data.topo_cardapio_simulacoes.length;

  const preview = {
    valid: true,
    schema_version: body.schema_version,
    exported_at: body.exported_at,
    store_name: body.store_name,
    counts,
  };

  return jsonResponse(preview);
}

async function handleImportExecute(supabaseAdmin: any, body: any, userId: string, mode: string) {
  // Re-validate
  if (!body || body.format !== "precify-backup") {
    return jsonResponse({ error: "Formato de arquivo inválido." }, 400);
  }
  if (!COMPATIBLE_VERSIONS.includes(body.schema_version)) {
    return jsonResponse({ error: `Versão incompatível: ${body.schema_version}` }, 400);
  }

  const data = body.data || {};
  
  // Resolve store: check if the backup's store exists for this user, otherwise use default or create one
  let storeId: string | null = null;
  if (body.store_id) {
    const { data: existingStore } = await supabaseAdmin
      .from("stores").select("id").eq("id", body.store_id).eq("user_id", userId).maybeSingle();
    if (existingStore) {
      storeId = existingStore.id;
    } else {
      // Try to find user's default store
      const { data: defaultStore } = await supabaseAdmin
        .from("stores").select("id").eq("user_id", userId).eq("is_default", true).maybeSingle();
      if (defaultStore) {
        storeId = defaultStore.id;
      } else {
        // Create a new store with the backup's store name
        const storeName = body.store_name || "Loja Importada";
        const { data: newStore, error: storeErr } = await supabaseAdmin
          .from("stores").insert({ user_id: userId, name: storeName, is_default: true }).select("id").single();
        if (storeErr) throw new Error(`Erro ao criar loja: ${storeErr.message}`);
        storeId = newStore.id;
      }
    }
  }

  try {
    if (mode === "replace") {
      await executeReplace(supabaseAdmin, data, userId, storeId);
    } else {
      await executeMerge(supabaseAdmin, data, userId, storeId);
    }

    // Audit log
    await supabaseAdmin.from("data_audit_log").insert({
      user_id: userId,
      action: "backup_import",
      table_name: "all",
      record_id: storeId || userId,
      new_data: {
        mode,
        schema_version: body.schema_version,
        store_id: storeId,
      },
    });

    return jsonResponse({ success: true, mode });
  } catch (err: any) {
    console.error("Import error:", err);
    return jsonResponse({ error: "Erro na importação. Verifique o arquivo e tente novamente." }, 500);
  }
}

async function executeReplace(admin: any, data: any, userId: string, storeId: string | null) {
  const deleteFilter = (table: string) => {
    let q = admin.from(table).delete().eq("user_id", userId);
    if (storeId) q = q.eq("store_id", storeId);
    return q;
  };

  // 1. Get IDs to delete relational records
  const { data: existingRecipes } = await admin.from("recipes").select("id").eq("user_id", userId).then((r: any) => r);
  const { data: existingSubRecipes } = await admin.from("sub_recipes").select("id").eq("user_id", userId);
  const { data: existingCombos } = await admin.from("combos").select("id").eq("user_id", userId);
  const { data: existingExpenses } = await admin.from("fixed_expenses").select("id").eq("user_id", userId);
  const { data: existingCmvPeriodos } = await admin.from("cmv_periodos").select("id").eq("user_id", userId);

  const recipeIds = (existingRecipes || []).map((r: any) => r.id);
  const subRecipeIds = (existingSubRecipes || []).map((s: any) => s.id);
  const comboIds = (existingCombos || []).map((c: any) => c.id);
  const expenseIds = (existingExpenses || []).map((e: any) => e.id);
  const cmvPeriodoIds = (existingCmvPeriodos || []).map((p: any) => p.id);

  // 2. Delete in dependency order
  if (cmvPeriodoIds.length > 0) await admin.from("cmv_categorias").delete().in("periodo_id", cmvPeriodoIds);
  if (expenseIds.length > 0) await admin.from("cost_allocations").delete().in("expense_id", expenseIds);
  if (comboIds.length > 0) await admin.from("combo_items").delete().in("combo_id", comboIds);
  if (recipeIds.length > 0) await admin.from("recipe_ingredients").delete().in("recipe_id", recipeIds);
  if (subRecipeIds.length > 0) await admin.from("sub_recipe_ingredients").delete().in("sub_recipe_id", subRecipeIds);

  // Delete topo_cardapio_simulacoes
  await admin.from("topo_cardapio_simulacoes").delete().eq("user_id", userId).then(() => {}).catch(() => {});

  await Promise.all([
    deleteFilter("combos"),
    deleteFilter("recipes"),
    deleteFilter("sub_recipes"),
    deleteFilter("beverages"),
    deleteFilter("ingredients"),
    deleteFilter("fixed_costs"),
    deleteFilter("variable_costs"),
    deleteFilter("fixed_expenses"),
    deleteFilter("variable_expenses"),
    deleteFilter("business_taxes"),
    deleteFilter("card_fees"),
    deleteFilter("monthly_revenues"),
    deleteFilter("cmv_periodos"),
  ]);

  // 3. Insert in dependency order
  await insertData(admin, data, userId, storeId);
}

async function executeMerge(admin: any, data: any, userId: string, storeId: string | null) {
  // For merge, only insert items whose name doesn't exist yet
  const getExistingNames = async (table: string) => {
    let q = admin.from(table).select("name").eq("user_id", userId);
    if (storeId) q = q.eq("store_id", storeId);
    const { data: rows } = await q;
    return new Set((rows || []).map((r: any) => r.name));
  };

  const filterNew = (items: any[], existingNames: Set<string>) =>
    items.filter((i: any) => !existingNames.has(i.name));

  // Filter tables with name field
  const tables = ["ingredients", "sub_recipes", "recipes", "beverages", "combos",
    "fixed_costs", "variable_costs", "fixed_expenses", "variable_expenses"];

  const existingSets: Record<string, Set<string>> = {};
  await Promise.all(tables.map(async (t) => {
    existingSets[t] = await getExistingNames(t);
  }));

  const filteredData: Record<string, any[]> = {};
  for (const t of tables) {
    filteredData[t] = filterNew(data[t] || [], existingSets[t]);
  }

  // For non-name tables (taxes, fees, revenues), insert all
  filteredData.business_taxes = data.business_taxes || [];
  filteredData.card_fees = data.card_fees || [];
  filteredData.monthly_revenues = data.monthly_revenues || [];
  filteredData.cmv_periodos = data.cmv_periodos || [];
  filteredData.cmv_categorias = data.cmv_categorias || [];
  filteredData.cost_allocations = data.cost_allocations || [];
  filteredData.topo_cardapio_simulacoes = data.topo_cardapio_simulacoes || [];

  // Build a merged data object and insert
  await insertData(admin, {
    ...data,
    ...filteredData,
  }, userId, storeId);
}

async function insertData(admin: any, data: any, userId: string, storeId: string | null) {
  const addMeta = (items: any[]) =>
    items.map((i: any) => ({ ...i, user_id: userId, store_id: storeId }));

  // Resolve store name map for v2.0.0 imports
  // Get all stores for this user to map names to IDs
  const { data: userStores } = await admin.from("stores").select("id, name").eq("user_id", userId);
  const storeNameToId = new Map((userStores || []).map((s: any) => [s.name, s.id]));

  // 1. Insert ingredients
  const ingredientsToInsert = addMeta(
    (data.ingredients || []).map((i: any) => pick(i, EXPORT_FIELDS.ingredients))
  );
  let insertedIngredients: any[] = [];
  if (ingredientsToInsert.length > 0) {
    const { data: ins, error } = await admin.from("ingredients").insert(ingredientsToInsert).select("id, name");
    if (error) throw new Error(`Erro ao inserir insumos: ${error.message}`);
    insertedIngredients = ins || [];
  }
  const ingredientNameToId = new Map(insertedIngredients.map((i: any) => [i.name, i.id]));

  // 2. Insert sub_recipes
  const subRecipesToInsert = addMeta(
    (data.sub_recipes || []).map((s: any) => pick(s, EXPORT_FIELDS.sub_recipes))
  );
  let insertedSubRecipes: any[] = [];
  if (subRecipesToInsert.length > 0) {
    const { data: srs, error } = await admin.from("sub_recipes").insert(subRecipesToInsert).select("id, name");
    if (error) throw new Error(`Erro ao inserir sub-receitas: ${error.message}`);
    insertedSubRecipes = srs || [];
  }
  const subRecipeNameToId = new Map(insertedSubRecipes.map((s: any) => [s.name, s.id]));

  // 3. Insert sub_recipe_ingredients
  const subRecipeIngs = (data.sub_recipe_ingredients || [])
    .map((si: any) => {
      const ingredientId = ingredientNameToId.get(si.ingredient_name);
      const subRecipeId = subRecipeNameToId.get(si.sub_recipe_name);
      if (!ingredientId || !subRecipeId) return null;
      return { ingredient_id: ingredientId, sub_recipe_id: subRecipeId, quantity: si.quantity, unit: si.unit };
    })
    .filter(Boolean);
  if (subRecipeIngs.length > 0) {
    const { error } = await admin.from("sub_recipe_ingredients").insert(subRecipeIngs);
    if (error) throw new Error(`Erro ao inserir ingredientes de sub-receita: ${error.message}`);
  }

  // 4. Insert recipes
  const recipesToInsert = addMeta(
    (data.recipes || []).map((r: any) => pick(r, EXPORT_FIELDS.recipes))
  );
  let insertedRecipes: any[] = [];
  if (recipesToInsert.length > 0) {
    const { data: recs, error } = await admin.from("recipes").insert(recipesToInsert).select("id, name");
    if (error) throw new Error(`Erro ao inserir receitas: ${error.message}`);
    insertedRecipes = recs || [];
  }
  const recipeNameToId = new Map(insertedRecipes.map((r: any) => [r.name, r.id]));

  // 5. Insert recipe_ingredients
  const recipeIngs = (data.recipe_ingredients || [])
    .map((ri: any) => {
      const ingredientId = ingredientNameToId.get(ri.ingredient_name);
      const recipeId = recipeNameToId.get(ri.recipe_name);
      if (!ingredientId || !recipeId) return null;
      return { ingredient_id: ingredientId, recipe_id: recipeId, quantity: ri.quantity, unit: ri.unit };
    })
    .filter(Boolean);
  if (recipeIngs.length > 0) {
    const { error } = await admin.from("recipe_ingredients").insert(recipeIngs);
    if (error) throw new Error(`Erro ao inserir ingredientes de receita: ${error.message}`);
  }

  // 6. Insert beverages
  const beveragesToInsert = addMeta(
    (data.beverages || []).map((b: any) => pick(b, EXPORT_FIELDS.beverages))
  );
  if (beveragesToInsert.length > 0) {
    const { error } = await admin.from("beverages").insert(beveragesToInsert);
    if (error) throw new Error(`Erro ao inserir bebidas: ${error.message}`);
  }

  // 7. Insert combos
  const combosToInsert = addMeta(
    (data.combos || []).map((c: any) => pick(c, EXPORT_FIELDS.combos))
  );
  let insertedCombos: any[] = [];
  if (combosToInsert.length > 0) {
    const { data: cbs, error } = await admin.from("combos").insert(combosToInsert).select("id, name");
    if (error) throw new Error(`Erro ao inserir combos: ${error.message}`);
    insertedCombos = cbs || [];
  }
  const comboNameToId = new Map(insertedCombos.map((c: any) => [c.name, c.id]));

  // 8. Insert combo_items
  const comboItemsToInsert = (data.combo_items || [])
    .map((ci: any) => {
      const comboId = comboNameToId.get(ci.combo_name);
      if (!comboId) return null;
      return { combo_id: comboId, item_name: ci.item_name, item_type: ci.item_type, role: ci.role };
    })
    .filter(Boolean);
  if (comboItemsToInsert.length > 0) {
    const { error } = await admin.from("combo_items").insert(comboItemsToInsert);
    if (error) throw new Error(`Erro ao inserir itens de combo: ${error.message}`);
  }

  // 9. Insert costs, expenses (exclusive only), taxes, fees, revenues
  const fixedExpensesToInsert = (data.fixed_expenses || [])
    .filter((fe: any) => !fe.cost_type || fe.cost_type === "exclusive")
    .map((fe: any) => {
      const item: any = { name: fe.name, monthly_value: fe.monthly_value, user_id: userId, store_id: storeId };
      if (fe.store_name && storeNameToId.has(fe.store_name)) {
        item.store_id = storeNameToId.get(fe.store_name);
      }
      return item;
    });

  const simpleTables = [
    { key: "fixed_costs", fields: EXPORT_FIELDS.fixed_costs },
    { key: "variable_costs", fields: EXPORT_FIELDS.variable_costs },
    { key: "variable_expenses", fields: EXPORT_FIELDS.variable_expenses },
    { key: "business_taxes", fields: EXPORT_FIELDS.business_taxes },
    { key: "card_fees", fields: EXPORT_FIELDS.card_fees },
    { key: "monthly_revenues", fields: EXPORT_FIELDS.monthly_revenues },
  ];

  // Insert fixed_expenses (exclusive)
  if (fixedExpensesToInsert.length > 0) {
    const { error } = await admin.from("fixed_expenses").insert(fixedExpensesToInsert);
    if (error) throw new Error(`Erro ao inserir despesas fixas: ${error.message}`);
  }

  for (const { key, fields } of simpleTables) {
    const items = addMeta((data[key] || []).map((item: any) => pick(item, fields)));
    if (items.length > 0) {
      const { error } = await admin.from(key).insert(items);
      if (error) throw new Error(`Erro ao inserir ${key}: ${error.message}`);
    }
  }

  // 10. Insert CMV periodos + categorias
  const cmvPeriodosToInsert = (data.cmv_periodos || []).map((p: any) => {
    const item: any = { ...pick(p, EXPORT_FIELDS.cmv_periodos), user_id: userId, store_id: storeId };
    if (p.store_name && storeNameToId.has(p.store_name)) {
      item.store_id = storeNameToId.get(p.store_name);
    }
    return item;
  });

  if (cmvPeriodosToInsert.length > 0) {
    const { data: insertedPeriodos, error } = await admin.from("cmv_periodos").insert(cmvPeriodosToInsert).select("id, mes, ano");
    if (error) throw new Error(`Erro ao inserir períodos CMV: ${error.message}`);

    // Map periodo by mes+ano to new IDs for categorias
    const periodoKeyToId = new Map(
      (insertedPeriodos || []).map((p: any) => [`${p.mes}-${p.ano}`, p.id])
    );

    const cmvCategoriasToInsert = (data.cmv_categorias || [])
      .map((c: any) => {
        const periodoId = periodoKeyToId.get(`${c.periodo_mes}-${c.periodo_ano}`);
        if (!periodoId) return null;
        return {
          ...pick(c, EXPORT_FIELDS.cmv_categorias),
          periodo_id: periodoId,
        };
      })
      .filter(Boolean);

    if (cmvCategoriasToInsert.length > 0) {
      const { error: catErr } = await admin.from("cmv_categorias").insert(cmvCategoriasToInsert);
      if (catErr) throw new Error(`Erro ao inserir categorias CMV: ${catErr.message}`);
    }
  }

  // 11. Insert topo_cardapio_simulacoes
  const topoToInsert = (data.topo_cardapio_simulacoes || []).map((t: any) => ({
    ...pick(t, EXPORT_FIELDS.topo_cardapio_simulacoes),
    user_id: userId,
    store_id: storeId,
  }));
  if (topoToInsert.length > 0) {
    await admin.from("topo_cardapio_simulacoes").insert(topoToInsert).catch(() => {});
  }

  // 12. Update profile
  if (data.profile) {
    const profileUpdate = pick(data.profile, PROFILE_FIELDS);
    const { error } = await admin.from("profiles").update(profileUpdate).eq("user_id", userId);
    if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action || !["export", "import"].includes(action)) {
      return jsonResponse({ error: "Parâmetro action inválido. Use ?action=export ou ?action=import" }, 400);
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Token de autenticação não fornecido." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Sessão inválida ou expirada." }, 401);
    }

    const userId = user.id;

    // Rate limiting — skip for import preview (read-only validation)
    const isImportPreview = action === "import" && url.searchParams.get("preview") === "true";
    if (!isImportPreview) {
      const endpoint = action === "export" ? "backup_export" : "backup_import";
      const maxRequests = action === "export" ? 10 : 10;
      const { data: rateResult } = await supabaseAuth.rpc("check_rate_limit", {
        _key: userId,
        _endpoint: endpoint,
        _max_requests: maxRequests,
        _window_seconds: 3600,
        _block_seconds: 300,
      });

      if (rateResult && rateResult.length > 0 && !rateResult[0].allowed) {
        return jsonResponse({
          error: "Limite de operações atingido. Tente novamente em alguns minutos.",
          retry_after: rateResult[0].retry_after_seconds,
        }, 429);
      }
    }

    if (action === "export") {
      if (req.method !== "GET") {
        return jsonResponse({ error: "Use GET para exportar." }, 405);
      }
      const storeId = url.searchParams.get("store_id") || null;
      return await handleExport(supabaseAuth, userId, storeId);
    }

    if (action === "import") {
      if (req.method !== "POST") {
        return jsonResponse({ error: "Use POST para importar." }, 405);
      }

      const body = await req.json();
      const preview = url.searchParams.get("preview");

      if (preview === "true") {
        return await handleImportPreview(body, userId);
      }

      const mode = url.searchParams.get("mode") || "merge";
      if (!["replace", "merge"].includes(mode)) {
        return jsonResponse({ error: "Modo inválido. Use ?mode=replace ou ?mode=merge" }, 400);
      }

      return await handleImportExecute(supabaseAuth, body, userId, mode);
    }

    return jsonResponse({ error: "Ação não reconhecida." }, 400);
  } catch (err: any) {
    console.error("Backup-restore error:", err);
    return jsonResponse({ error: "Erro interno do servidor." }, 500);
  }
});
