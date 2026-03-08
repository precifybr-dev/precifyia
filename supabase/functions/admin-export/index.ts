import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Module definitions (modular & extensible) ──────────────────────
interface ExportModule {
  name: string;
  label: string;
  description: string;
  query: (client: any) => Promise<{ data: any[]; count: number }>;
  allowedFields: string[];
  blockedFields: string[];
  sanitize?: (row: any) => any;
}

const MAX_ROWS = 10_000;

const MODULES: Record<string, ExportModule> = {
  users: {
    name: "users",
    label: "Usuários",
    description: "Dados de perfil de usuários",
    allowedFields: ["user_id", "email", "business_name", "user_plan", "subscription_status", "created_at", "updated_at", "onboarding_step"],
    blockedFields: ["password", "token", "secret"],
    query: async (client) => {
      const { data, error, count } = await client
        .from("profiles")
        .select("user_id, email, business_name, user_plan, subscription_status, created_at, updated_at, onboarding_step", { count: "exact" })
        .limit(MAX_ROWS);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  },
  database: {
    name: "database",
    label: "Database",
    description: "Estrutura das tabelas do banco de dados",
    allowedFields: ["table_name", "row_count", "schema"],
    blockedFields: [],
    query: async (client) => {
      const { data, error } = await client.rpc("get_table_stats");
      if (error) {
        // Fallback: query information_schema
        const { data: tables, error: err2 } = await client
          .from("ingredients")
          .select("id", { count: "exact", head: true });
        // Return basic info
        const tableNames = [
          "profiles", "ingredients", "beverages", "recipes", "recipe_ingredients",
          "fixed_costs", "fixed_expenses", "variable_costs", "variable_expenses",
          "stores", "store_members", "combos", "combo_items", "combo_memory",
          "combo_generation_usage", "cmv_periodos", "cmv_categorias",
          "business_taxes", "card_fees", "deleted_records", "access_logs",
          "platform_events", "support_tickets", "support_messages",
          "sharing_groups", "sharing_group_stores", "cost_allocations",
          "calculation_history", "data_audit_log", "monthly_revenues",
          "sub_recipes", "sub_recipe_ingredients",
          "marketing_campaigns", "marketing_monthly_data",
          "monetization_settings", "payment_links", "pricing_anchoring_config",
          "pricing_audit_log", "pricing_phrases", "pricing_plans",
          "rate_limit_entries", "rate_limit_global", "risk_flags",
          "support_abuse_alerts", "support_consent", "support_session_logs",
          "ticket_messages", "ticket_notes", "topo_cardapio_simulacoes",
          "university_modules", "university_courses", "university_lessons",
          "university_progress", "user_lesson_progress", "user_sessions",
          "user_roles", "user_security", "user_permissions", "role_permissions",
          "collaborators", "contract_acceptances", "controllership_config",
          "admin_alerts", "admin_audit_logs", "admin_export_logs",
          "affiliates", "commissions", "commission_config", "commission_payouts",
          "coupons", "coupon_uses", "fraud_flags", "funnel_events",
          "help_content", "ifood_import_usage", "plan_features",
          "strategic_usage_logs", "user_payments",
          "architecture_prompts", "architecture_base_checks",
          "architecture_certifications", "architecture_history",
          "architecture_score_history",
        ];
        return {
          data: tableNames.map((t) => ({ table_name: t, schema: "public" })),
          count: tableNames.length,
        };
      }
      return { data: data || [], count: (data || []).length };
    },
  },
  storage: {
    name: "storage",
    label: "Storage",
    description: "Arquivos armazenados nos buckets",
    allowedFields: ["name", "bucket_id", "size", "created_at", "updated_at", "owner"],
    blockedFields: [],
    query: async (client) => {
      const { data, error } = await client.storage.listBuckets();
      if (error) throw error;
      const results: any[] = [];
      for (const bucket of data || []) {
        const { data: files } = await client.storage.from(bucket.id).list("", { limit: 500 });
        for (const file of files || []) {
          results.push({
            name: file.name,
            bucket_id: bucket.id,
            size: file.metadata?.size || 0,
            created_at: file.created_at,
            updated_at: file.updated_at,
            owner: file.metadata?.owner ? "***" : "system",
          });
        }
      }
      return { data: results.slice(0, MAX_ROWS), count: results.length };
    },
  },
  edge_functions: {
    name: "edge_functions",
    label: "Edge Functions",
    description: "Funções backend registradas no sistema",
    allowedFields: ["name", "status"],
    blockedFields: [],
    query: async () => {
      const functions = [
        "calculate-recipe-pricing", "calculate-business-metrics", "calculate-ifood-fees",
        "generate-combo", "backup-restore", "validate-coupon", "process-commissions",
        "secure-signup", "analyze-menu-performance", "analyze-spreadsheet-columns",
        "generate-menu-strategy", "log-access", "manage-collaborator", "parse-ifood-menu",
        "send-mfa-code", "setup-master-user", "verify-mfa-code",
        "admin-stats", "admin-users", "admin-export",
      ];
      const data = functions.map((f) => ({ name: f, status: "deployed" }));
      return { data, count: data.length };
    },
  },
  secrets: {
    name: "secrets",
    label: "Secrets",
    description: "Segredos configurados (sem valores reais)",
    allowedFields: ["name", "status", "environment"],
    blockedFields: ["value"],
    query: async () => {
      const knownSecrets = [
        "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_DB_URL", "TURNSTILE_SECRET_KEY",
      ];
      const data = knownSecrets.map((s) => ({
        name: s,
        status: "configured",
        environment: "production",
      }));
      return { data, count: data.length };
    },
  },
  logs: {
    name: "logs",
    label: "Logs",
    description: "Logs de acesso e eventos da plataforma",
    allowedFields: ["id", "action", "created_at", "success", "user_id_anonymized"],
    blockedFields: ["ip_address", "user_agent"],
    query: async (client) => {
      const { data, error, count } = await client
        .from("access_logs")
        .select("id, action, created_at, success, user_id", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    sanitize: (row: any) => ({
      ...row,
      user_id_anonymized: row.user_id ? row.user_id.substring(0, 8) + "****" : null,
      user_id: undefined,
    }),
  },
  platform_events: {
    name: "platform_events",
    label: "Eventos da Plataforma",
    description: "Eventos de uso e interação dos usuários",
    allowedFields: ["id", "event_type", "event_category", "created_at", "user_id_anonymized"],
    blockedFields: ["metadata"],
    query: async (client) => {
      const { data, error, count } = await client
        .from("platform_events")
        .select("id, event_type, event_category, created_at, user_id", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    sanitize: (row: any) => ({
      ...row,
      user_id_anonymized: row.user_id ? row.user_id.substring(0, 8) + "****" : null,
      user_id: undefined,
    }),
  },
  support_tickets: {
    name: "support_tickets",
    label: "Tickets de Suporte",
    description: "Tickets e atendimentos de suporte",
    allowedFields: ["id", "subject", "category", "priority", "status", "created_at", "updated_at"],
    blockedFields: ["user_id"],
    query: async (client) => {
      const { data, error, count } = await client
        .from("support_tickets")
        .select("id, subject, category, priority, status, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  },
};

// ── CSV conversion ─────────────────────────────────────────────────
function toCSV(data: any[], allowedFields: string[]): string {
  if (!data || data.length === 0) return "";

  // Use allowed fields that exist in data, or fallback to data keys
  const sampleKeys = Object.keys(data[0]);
  const headers = allowedFields.length > 0
    ? allowedFields.filter((f) => sampleKeys.includes(f))
    : sampleKeys;

  if (headers.length === 0) return "";

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(",")];
  for (const row of data) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n");
}

// ── Main handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth validation
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Admin client for data access
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["master", "admin"])
      .limit(1);

    if (!roleCheck || roleCheck.length === 0) {
      return new Response(JSON.stringify({ error: "Acesso negado. Requer role admin." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 5 exports per minute
    const { data: rateCheck } = await adminClient.rpc("check_rate_limit", {
      _key: userId,
      _endpoint: "admin-export",
      _max_requests: 5,
      _window_seconds: 60,
      _block_seconds: 30,
    });

    if (rateCheck && rateCheck.length > 0 && !rateCheck[0].allowed) {
      const retryAfter = rateCheck[0].retry_after_seconds || 30;
      return new Response(
        JSON.stringify({ error: "Rate limit excedido. Tente novamente em breve.", retry_after_seconds: retryAfter }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) },
        }
      );
    }

    // Parse body
    const body = await req.json();
    const moduleName = body.module;

    // ── Special module: schema_sql ─────────────────────────────────
    if (moduleName === "schema_sql") {
      // Use the database function that queries information_schema properly
      const { data: schemaResult, error: schemaErr } = await adminClient.rpc("generate_schema_ddl");

      let schemaSQL = "";
      if (schemaErr || !schemaResult) {
        schemaSQL = `-- Erro ao gerar schema: ${schemaErr?.message || "resultado vazio"}\n`;
        schemaSQL += `-- Tente novamente ou contate o suporte.\n`;
      } else {
        schemaSQL = schemaResult;
      }

      // Audit log
      await adminClient.from("admin_export_logs").insert({
        admin_id: userId,
        module: "schema_sql",
        record_count: 0,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
        status: "success",
      });

      return new Response(schemaSQL, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    if (!moduleName || !MODULES[moduleName]) {
      return new Response(
        JSON.stringify({ error: "Módulo inválido", available_modules: [...Object.keys(MODULES), "schema_sql"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mod = MODULES[moduleName];

    // Fetch data
    const { data: rawData, count } = await mod.query(adminClient);

    // Sanitize
    const sanitizedData = mod.sanitize ? rawData.map(mod.sanitize) : rawData;

    // Remove blocked fields
    const cleanData = sanitizedData.map((row: any) => {
      const clean = { ...row };
      for (const blocked of mod.blockedFields) {
        delete clean[blocked];
      }
      // Also remove undefined values
      for (const key of Object.keys(clean)) {
        if (clean[key] === undefined) delete clean[key];
      }
      return clean;
    });

    // Convert to CSV
    const csv = toCSV(cleanData, mod.allowedFields);

    // Audit log
    await adminClient.from("admin_export_logs").insert({
      admin_id: userId,
      module: moduleName,
      record_count: cleanData.length,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
      status: "success",
    });

    const filename = `export_${moduleName}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Record-Count": String(cleanData.length),
        "X-Total-Count": String(count),
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar exportação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
