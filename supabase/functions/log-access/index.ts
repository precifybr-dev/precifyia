import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LogAccessRequest {
  userId: string;
  action: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// Rate limiting for logging
const LOG_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const LOG_RATE_LIMIT_MAX = 100; // Max logs per window per user
const logRateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkLogRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = logRateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    logRateLimitStore.set(userId, { count: 1, resetTime: now + LOG_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= LOG_RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Enhanced device/network fingerprinting
function getClientInfo(req: Request): Record<string, string | null> {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ipList = forwardedFor?.split(',').map(ip => ip.trim()) || [];
  
  return {
    // Primary IP (first in chain, closest to client)
    ip: ipList[0] || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown',
    // Full IP chain for proxy detection
    ipChain: forwardedFor || null,
    // User agent
    userAgent: req.headers.get('user-agent') || 'unknown',
    // Cloudflare geolocation
    country: req.headers.get('cf-ipcountry') || null,
    city: req.headers.get('cf-ipcity') || null,
    region: req.headers.get('cf-ipregion') || null,
    continent: req.headers.get('cf-ipcontinent') || null,
    timezone: req.headers.get('cf-timezone') || null,
    // Connection info
    connectionType: req.headers.get('cf-ipclienttcprtt') || null,
    httpProtocol: req.headers.get('cf-visitor') || null,
    tlsVersion: req.headers.get('cf-tls-version') || null,
    // Client hints (modern browsers)
    deviceModel: req.headers.get('sec-ch-ua-model') || null,
    platform: req.headers.get('sec-ch-ua-platform') || null,
    platformVersion: req.headers.get('sec-ch-ua-platform-version') || null,
    isMobile: req.headers.get('sec-ch-ua-mobile') || null,
    // Request info
    acceptLanguage: req.headers.get('accept-language') || null,
    acceptEncoding: req.headers.get('accept-encoding') || null,
    origin: req.headers.get('origin') || null,
    referer: req.headers.get('referer') || null,
    // Bot detection hints
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
    
    const { userId, action, success, metadata }: LogAccessRequest = await req.json();
    
    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId e action são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit for logging
    if (!checkLogRateLimit(userId)) {
      console.log('[LOG] Rate limit exceeded for user:', userId);
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

    // Insert log with enhanced data
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
