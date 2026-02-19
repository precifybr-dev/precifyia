import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyRequest {
  userId: string;
  code: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const rawBody = await req.json();

    // ─── MASS ASSIGNMENT PROTECTION: Only allow userId and code ───
    const userId = typeof rawBody.userId === 'string' ? rawBody.userId.trim() : null;
    const code = typeof rawBody.code === 'string' ? rawBody.code.trim() : null;

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: 'userId e code são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── OWNERSHIP: Validate that the userId exists in auth.users ───
    // Prevents spoofing arbitrary user IDs to verify MFA for other accounts
    const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
    if (authLookupError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado', valid: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Rate Limiting: 10 tentativas/min por usuário, 20/min por IP (anti-brute-force) ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [{ data: userRL }, { data: ipRL }] = await Promise.all([
      supabase.rpc("check_rate_limit", { _key: userId, _endpoint: "verify-mfa", _max_requests: 10, _window_seconds: 60, _block_seconds: 300 }),
      supabase.rpc("check_rate_limit", { _key: `ip:${clientIp}`, _endpoint: "verify-mfa", _max_requests: 20, _window_seconds: 60, _block_seconds: 300 }),
    ]);
    const rl = userRL?.[0] || ipRL?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde alguns minutos.', valid: false }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry_after_seconds) } }
      );
    }

    // Buscar código salvo
    const { data: security, error: fetchError } = await supabase
      .from('user_security')
      .select('last_mfa_code, mfa_code_expires_at')
      .eq('user_id', userId)
      .single();

    if (fetchError || !security) {
      return new Response(
        JSON.stringify({ error: 'Código não encontrado', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    const expiresAt = new Date(security.mfa_code_expires_at);
    if (new Date() > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Código expirado', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar código
    if (security.last_mfa_code !== code) {
      return new Response(
        JSON.stringify({ error: 'Código inválido', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar MFA como verificado e limpar código
    const { error: updateError } = await supabase
      .from('user_security')
      .update({
    mfa_verified: true,
    mfa_verified_at: new Date().toISOString(),
    last_mfa_code: null,
        mfa_code_expires_at: null,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao atualizar verificação MFA:', updateError);
    }

    return new Response(
      JSON.stringify({ valid: true, message: 'Código verificado com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função verify-mfa-code:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
