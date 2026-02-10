import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MASTER_EMAIL = "precify.br@gmail.com";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ─── AUTHENTICATION REQUIRED ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Autenticação obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ─── VERIFY CALLER IDENTITY ───
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    const callerEmail = claimsData.claims.email as string;

    // ─── ONLY THE MASTER EMAIL CAN INVOKE THIS ───
    if (callerEmail?.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
      console.error(`[SECURITY] Unauthorized setup-master-user attempt by: ${callerEmail} (${callerId})`);
      return new Response(
        JSON.stringify({ error: 'Acesso restrito ao proprietário do sistema' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Rate Limiting: 3 req/hour ───
    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      _key: callerId, _endpoint: "setup-master", _max_requests: 3, _window_seconds: 3600, _block_seconds: 3600,
    });
    const rl = rlData?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry_after_seconds) } }
      );
    }

    // Verificar se já tem role master configurado
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', callerId)
      .eq('role', 'master')
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ message: 'Usuário master já configurado', userId: callerId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configurar role e segurança para o usuário autenticado
    await setupMasterUser(supabase, callerId);

    // ─── AUDIT LOG ───
    await supabase.from('admin_audit_logs').insert({
      admin_user_id: callerId,
      target_user_id: callerId,
      action: 'setup_master_user',
      action_type: 'security',
      new_value: { role: 'master', is_protected: true },
    });

    return new Response(
      JSON.stringify({ 
        message: 'Configuração master aplicada com sucesso', 
        userId: callerId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função setup-master-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function setupMasterUser(supabase: any, userId: string) {
  // Criar role master protegido
  await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'master',
      is_protected: true,
    }, { onConflict: 'user_id,role' });

  // Configurar segurança - MFA ativado
  await supabase
    .from('user_security')
    .upsert({
      user_id: userId,
      must_change_password: false,
      mfa_enabled: true,
      mfa_verified: false,
    }, { onConflict: 'user_id' });

  // Criar profile se não existir
  await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      business_name: 'PRECIFY Master',
      onboarding_step: 'completed',
    }, { onConflict: 'user_id' });
}
