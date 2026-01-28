import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AdminAction {
  action: 'list_users' | 'get_user' | 'reset_password' | 'change_plan' | 
          'extend_subscription' | 'get_financial_history' | 'get_support_history' |
          'start_impersonation' | 'end_impersonation' | 'update_status';
  targetUserId?: string;
  data?: Record<string, any>;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // New window
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: userLimit.resetTime - now 
    };
  }

  userLimit.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count, 
    resetIn: userLimit.resetTime - now 
  };
}

// Enhanced device fingerprint
function getDeviceFingerprint(req: Request): Record<string, string | null> {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
        req.headers.get('cf-connecting-ip') || 
        req.headers.get('x-real-ip') || 
        'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    country: req.headers.get('cf-ipcountry') || null,
    city: req.headers.get('cf-ipcity') || null,
    acceptLanguage: req.headers.get('accept-language') || null,
    referer: req.headers.get('referer') || null,
    origin: req.headers.get('origin') || null,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  const deviceInfo = getDeviceFingerprint(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[SECURITY] Unauthorized access attempt', { ...deviceInfo, timestamp: new Date().toISOString() });
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com service role para operações admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Cliente com o token do usuário para validação
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    
    // Validar o token usando getClaims
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log('[SECURITY] Invalid token attempt', { ...deviceInfo, timestamp: new Date().toISOString() });
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar objeto user a partir das claims
    const user = {
      id: claimsData.claims.sub as string,
      email: claimsData.claims.email as string,
    };

    // Usar supabaseAdmin para o resto das operações
    const supabase = supabaseAdmin;

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
    };

    if (!rateLimit.allowed) {
      console.log('[SECURITY] Rate limit exceeded', { 
        userId: user.id, 
        ...deviceInfo, 
        timestamp: new Date().toISOString() 
      });

      // Log rate limit violation
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'rate_limit_exceeded',
        success: false,
        ip_address: deviceInfo.ip,
        user_agent: deviceInfo.userAgent,
        metadata: { deviceInfo, reason: 'rate_limit' },
      });

      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em breve.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
          } 
        }
      );
    }

    const body: AdminAction = await req.json();

    // Verificar MFA para roles sensíveis
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { data: collaboratorData } = await supabase
      .from('collaborators')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const effectiveRole = roleData?.role || collaboratorData?.role || null;
    const sensitiveRoles = ['master', 'financeiro'];

    // Para roles sensíveis, verificar se MFA foi realizado recentemente
    if (sensitiveRoles.includes(effectiveRole)) {
      const { data: securityData } = await supabase
        .from('user_security')
        .select('mfa_verified, mfa_code_expires_at')
        .eq('user_id', user.id)
        .single();

      // Verificar se MFA está habilitado e verificado
      if (!securityData?.mfa_verified) {
        console.log('[SECURITY] MFA not verified for sensitive role', { 
          userId: user.id, 
          role: effectiveRole,
          ...deviceInfo 
        });
        
        return new Response(
          JSON.stringify({ error: 'Verificação MFA necessária', requiresMfa: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check permission based on action
    const permissionMap: Record<string, string> = {
      'list_users': 'view_users',
      'get_user': 'view_users',
      'reset_password': 'reset_password',
      'change_plan': 'manage_plans',
      'extend_subscription': 'manage_plans',
      'get_financial_history': 'view_financials',
      'get_support_history': 'respond_support',
      'start_impersonation': 'impersonate_user',
      'update_status': 'edit_users',
    };

    const requiredPermission = permissionMap[body.action];
    if (requiredPermission) {
      const { data: hasPermission } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission: requiredPermission
      });

      if (!hasPermission) {
        console.log('[SECURITY] Permission denied', { 
          userId: user.id, 
          action: body.action,
          requiredPermission,
          ...deviceInfo 
        });

        await logAudit(supabase, user.id, 'permission_denied', body.action, null, deviceInfo, null, {
          requiredPermission,
          action: body.action,
        });

        return new Response(
          JSON.stringify({ error: 'Sem permissão para esta ação' }),
          { status: 403, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Helper to log audit
    async function logAudit(
      db: any, 
      adminUserId: string, 
      actionType: string, 
      action: string, 
      targetUserId: string | null, 
      device: Record<string, string | null>,
      oldValue: any, 
      newValue: any
    ) {
      try {
        await db.from('admin_audit_logs').insert({
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          action,
          action_type: actionType,
          old_value: oldValue,
          new_value: { 
            ...newValue, 
            device,
            request_duration_ms: Date.now() - requestStartTime,
          },
          ip_address: device.ip,
          user_agent: device.userAgent,
        });
      } catch (error) {
        console.error('[AUDIT] Failed to log audit:', error);
      }
    }

    // Handle actions
    switch (body.action) {
      case 'list_users': {
        const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 500 });
        if (error) throw error;

        const userIds = users.users.map(u => u.id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, business_name, user_plan, subscription_status, subscription_expires_at, last_access_at, onboarding_step')
          .in('user_id', userIds);

        const enrichedUsers = users.users.map(u => {
          const profile = profiles?.find(p => p.user_id === u.id);
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            business_name: profile?.business_name || null,
            user_plan: profile?.user_plan || 'free',
            subscription_status: profile?.subscription_status || 'trial',
            subscription_expires_at: profile?.subscription_expires_at || null,
            last_access_at: profile?.last_access_at || u.last_sign_in_at,
            onboarding_step: profile?.onboarding_step || 'business',
          };
        });

        await logAudit(supabase, user.id, 'view_all_users', body.action, null, deviceInfo, null, { 
          user_count: enrichedUsers.length 
        });

        return new Response(
          JSON.stringify({ users: enrichedUsers }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_user': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: userData, error } = await supabase.auth.admin.getUserById(body.targetUserId);
        if (error) throw error;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', body.targetUserId)
          .single();

        const { data: stores } = await supabase
          .from('stores')
          .select('id, name, business_type')
          .eq('user_id', body.targetUserId);

        await logAudit(supabase, user.id, 'view_user_detail', body.action, body.targetUserId, deviceInfo, null, {
          viewed_email: userData.user.email,
        });

        return new Response(
          JSON.stringify({ 
            user: userData.user, 
            profile, 
            stores 
          }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_password': {
        if (!body.targetUserId || !body.data?.newPassword) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e newPassword são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is master
        const { data: masterCheck } = await supabase.rpc('is_master', { _user_id: body.targetUserId });
        if (masterCheck) {
          await logAudit(supabase, user.id, 'reset_password_blocked', body.action, body.targetUserId, deviceInfo, null, {
            reason: 'target_is_master'
          });
          return new Response(
            JSON.stringify({ error: 'Não é possível resetar a senha do usuário master' }),
            { status: 403, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase.auth.admin.updateUserById(body.targetUserId, {
          password: body.data.newPassword,
        });

        if (error) throw error;

        // Force password change on next login
        await supabase.from('user_security').upsert({
          user_id: body.targetUserId,
          must_change_password: true,
        }, { onConflict: 'user_id' });

        await logAudit(supabase, user.id, 'reset_password', body.action, body.targetUserId, deviceInfo, null, { 
          forced_change: true,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'change_plan': {
        if (!body.targetUserId || !body.data?.newPlan) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e newPlan são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('user_plan')
          .eq('user_id', body.targetUserId)
          .single();

        const { error } = await supabase
          .from('profiles')
          .update({ 
            user_plan: body.data.newPlan,
            subscription_status: 'active',
          })
          .eq('user_id', body.targetUserId);

        if (error) throw error;

        await logAudit(supabase, user.id, 'change_plan', body.action, body.targetUserId, deviceInfo,
          { plan: currentProfile?.user_plan }, 
          { plan: body.data.newPlan, timestamp: new Date().toISOString() }
        );

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'extend_subscription': {
        if (!body.targetUserId || !body.data?.days) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e days são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('subscription_expires_at')
          .eq('user_id', body.targetUserId)
          .single();

        const currentExpiry = currentProfile?.subscription_expires_at 
          ? new Date(currentProfile.subscription_expires_at)
          : new Date();
        
        const newExpiry = new Date(currentExpiry.getTime() + body.data.days * 24 * 60 * 60 * 1000);

        const { error } = await supabase
          .from('profiles')
          .update({ 
            subscription_expires_at: newExpiry.toISOString(),
            subscription_status: 'active',
          })
          .eq('user_id', body.targetUserId);

        if (error) throw error;

        await logAudit(supabase, user.id, 'extend_subscription', body.action, body.targetUserId, deviceInfo,
          { expires_at: currentProfile?.subscription_expires_at }, 
          { expires_at: newExpiry.toISOString(), days_added: body.data.days }
        );

        return new Response(
          JSON.stringify({ success: true, new_expiry: newExpiry.toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        if (!body.targetUserId || !body.data?.status) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e status são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('user_id', body.targetUserId)
          .single();

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: body.data.status })
          .eq('user_id', body.targetUserId);

        if (error) throw error;

        await logAudit(supabase, user.id, 'update_status', body.action, body.targetUserId, deviceInfo,
          { status: currentProfile?.subscription_status }, 
          { status: body.data.status }
        );

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_financial_history': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: payments, error } = await supabase
          .from('user_payments')
          .select('*')
          .eq('user_id', body.targetUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        await logAudit(supabase, user.id, 'view_financial', body.action, body.targetUserId, deviceInfo, null, {
          records_count: payments?.length || 0,
        });

        return new Response(
          JSON.stringify({ payments: payments || [] }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_support_history': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: tickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', body.targetUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        await logAudit(supabase, user.id, 'view_support', body.action, body.targetUserId, deviceInfo, null, {
          tickets_count: tickets?.length || 0,
        });

        return new Response(
          JSON.stringify({ tickets: tickets || [] }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start_impersonation': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is master - cannot impersonate master users
        const { data: masterCheck } = await supabase.rpc('is_master', { _user_id: body.targetUserId });
        if (masterCheck) {
          await logAudit(supabase, user.id, 'impersonation_blocked', body.action, body.targetUserId, deviceInfo, null, {
            reason: 'target_is_master'
          });
          return new Response(
            JSON.stringify({ error: 'Não é possível impersonar o usuário master' }),
            { status: 403, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get target user data
        const { data: targetUserData, error: targetError } = await supabase.auth.admin.getUserById(body.targetUserId);
        if (targetError) throw targetError;

        // Generate a REAL session for the target user using signInWithId (magic link approach)
        // We use generateLink to create a session token for the target user
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: targetUserData.user.email!,
          options: {
            redirectTo: `${req.headers.get('origin') || 'https://lovable.dev'}/app`,
          }
        });

        if (linkError) {
          console.error('[IMPERSONATION] Failed to generate session link:', linkError);
          throw linkError;
        }

        // Extract the token from the link
        const impersonationToken = `imp_${Date.now()}_${body.targetUserId}`;
        const startedAt = new Date().toISOString();

        // Log the impersonation start
        await logAudit(supabase, user.id, 'impersonation', 'impersonate_start', body.targetUserId, deviceInfo, null, { 
          started: true,
          target_email: targetUserData.user.email,
          impersonation_token: impersonationToken,
          started_at: startedAt,
          admin_email: user.email,
        });

        // Return the magic link token properties for client-side session creation
        return new Response(
          JSON.stringify({ 
            success: true,
            targetUser: {
              id: targetUserData.user.id,
              email: targetUserData.user.email,
            },
            impersonationToken,
            adminId: user.id,
            adminEmail: user.email,
            startedAt,
            // Include the hashed token and redirect info
            sessionData: {
              token_hash: linkData.properties?.hashed_token,
              email: targetUserData.user.email,
            }
          }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'end_impersonation': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logAudit(supabase, user.id, 'impersonate_end', body.action, body.targetUserId, deviceInfo, null, { 
          ended: true,
          impersonation_token: body.data?.impersonationToken || null,
          started_at: body.data?.startedAt || null,
          ended_at: new Date().toISOString(),
          duration_seconds: body.data?.startedAt 
            ? Math.floor((Date.now() - new Date(body.data.startedAt).getTime()) / 1000)
            : null,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[ERROR] admin-users:', error, { ...deviceInfo, timestamp: new Date().toISOString() });
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
