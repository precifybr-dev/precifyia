import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LogAccessRequest {
  action: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// Enhanced device/network fingerprinting
function getClientInfo(req: Request): Record<string, string | null> {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ipList = forwardedFor?.split(',').map(ip => ip.trim()) || [];
  
  return {
    ip: ipList[0] || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown',
    ipChain: forwardedFor || null,
    userAgent: req.headers.get('user-agent') || 'unknown',
    country: req.headers.get('cf-ipcountry') || null,
    city: req.headers.get('cf-ipcity') || null,
    region: req.headers.get('cf-ipregion') || null,
    continent: req.headers.get('cf-ipcontinent') || null,
    timezone: req.headers.get('cf-timezone') || null,
    connectionType: req.headers.get('cf-ipclienttcprtt') || null,
    httpProtocol: req.headers.get('cf-visitor') || null,
    tlsVersion: req.headers.get('cf-tls-version') || null,
    deviceModel: req.headers.get('sec-ch-ua-model') || null,
    platform: req.headers.get('sec-ch-ua-platform') || null,
    platformVersion: req.headers.get('sec-ch-ua-platform-version') || null,
    isMobile: req.headers.get('sec-ch-ua-mobile') || null,
    acceptLanguage: req.headers.get('accept-language') || null,
    acceptEncoding: req.headers.get('accept-encoding') || null,
    origin: req.headers.get('origin') || null,
    referer: req.headers.get('referer') || null,
    isBot: req.headers.get('cf-bot-management') || null,
    threatScore: req.headers.get('cf-threat-score') || null,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestTime = new Date().toISOString();
  const clientInfo = getClientInfo(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── OWNERSHIP: Authenticate user and derive userId from token ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // userId is ALWAYS derived from the authenticated token — never from the body
    const userId = user.id;

    const rawBody = await req.json();

    // ─── MASS ASSIGNMENT PROTECTION: Only allow whitelisted fields ───
    const action = typeof rawBody.action === 'string' ? rawBody.action : null;
    const success = typeof rawBody.success === 'boolean' ? rawBody.success : true;
    const metadata = (rawBody.metadata && typeof rawBody.metadata === 'object' && !Array.isArray(rawBody.metadata))
      ? rawBody.metadata as Record<string, unknown>
      : {};

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Rate Limiting: 100 req/min por usuário ───
    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      _key: userId, _endpoint: "log-access", _max_requests: 100, _window_seconds: 60, _block_seconds: 120,
    });
    const rl = rlData?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitos logs. Tente novamente em breve.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      clientInfo: {
        ip: clientInfo.ip,
        country: clientInfo.country,
        city: clientInfo.city,
        region: clientInfo.region,
        timezone: clientInfo.timezone,
        platform: clientInfo.platform,
        isMobile: clientInfo.isMobile,
      },
      request: {
        timestamp: requestTime,
        origin: clientInfo.origin,
        referer: clientInfo.referer,
        acceptLanguage: clientInfo.acceptLanguage,
      },
      security: {
        ipChain: clientInfo.ipChain,
        tlsVersion: clientInfo.tlsVersion,
        isBot: clientInfo.isBot,
        threatScore: clientInfo.threatScore,
      },
    };

    // Insert log — userId comes from the token, not from the request body
    const { error: insertError } = await supabase
      .from('access_logs')
      .insert({
        user_id: userId,
        action,
        success,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        metadata: enhancedMetadata,
      });

    if (insertError) {
      console.error('[LOG] Error inserting log:', insertError);
      throw insertError;
    }

    // For security-sensitive actions, also update user_security table
    const securityActions = ['login', 'login_complete', 'mfa_verified', 'mfa_admin_verified', 'password_changed'];
    if (securityActions.includes(action) && success) {
      await supabase
        .from('user_security')
        .update({
          updated_at: requestTime,
        })
        .eq('user_id', userId);
    }

    // For admin actions, create audit log as well
    const adminActions = ['admin_access', 'mfa_admin_verified', 'admin_mfa_requested'];
    if (adminActions.includes(action)) {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: userId,
        action,
        action_type: 'security_check',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        new_value: { 
          success, 
          timestamp: requestTime,
          location: {
            country: clientInfo.country,
            city: clientInfo.city,
            region: clientInfo.region,
          },
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, logged: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERROR] log-access:', error, { clientInfo, timestamp: requestTime });
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});