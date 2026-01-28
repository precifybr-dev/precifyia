import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AdminAction {
  action: 'list_users' | 'get_user' | 'reset_password' | 'change_plan' | 
          'extend_subscription' | 'get_financial_history' | 'get_support_history' |
          'start_impersonation' | 'update_status';
  targetUserId?: string;
  data?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP and User Agent for audit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const body: AdminAction = await req.json();

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
        return new Response(
          JSON.stringify({ error: 'Sem permissão para esta ação' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Helper to log audit
    const logAudit = async (actionType: string, targetUserId: string | null, oldValue: any, newValue: any) => {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: body.action,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    };

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

        return new Response(
          JSON.stringify({ users: enrichedUsers }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_user': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logAudit('view_user', body.targetUserId, null, null);

        return new Response(
          JSON.stringify({ 
            user: userData.user, 
            profile, 
            stores 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_password': {
        if (!body.targetUserId || !body.data?.newPassword) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e newPassword são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is master
        const { data: masterCheck } = await supabase.rpc('is_master', { _user_id: body.targetUserId });
        if (masterCheck) {
          return new Response(
            JSON.stringify({ error: 'Não é possível resetar a senha do usuário master' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logAudit('reset_password', body.targetUserId, null, { forced_change: true });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'change_plan': {
        if (!body.targetUserId || !body.data?.newPlan) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e newPlan são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logAudit('change_plan', body.targetUserId, 
          { plan: currentProfile?.user_plan }, 
          { plan: body.data.newPlan }
        );

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'extend_subscription': {
        if (!body.targetUserId || !body.data?.days) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e days são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logAudit('extend_subscription', body.targetUserId, 
          { expires_at: currentProfile?.subscription_expires_at }, 
          { expires_at: newExpiry.toISOString(), days_added: body.data.days }
        );

        return new Response(
          JSON.stringify({ success: true, new_expiry: newExpiry.toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        if (!body.targetUserId || !body.data?.status) {
          return new Response(
            JSON.stringify({ error: 'targetUserId e status são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logAudit('change_plan', body.targetUserId, 
          { status: currentProfile?.subscription_status }, 
          { status: body.data.status }
        );

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_financial_history': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: payments, error } = await supabase
          .from('user_payments')
          .select('*')
          .eq('user_id', body.targetUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        await logAudit('view_financial', body.targetUserId, null, null);

        return new Response(
          JSON.stringify({ payments: payments || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_support_history': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: tickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', body.targetUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        await logAudit('view_support', body.targetUserId, null, null);

        return new Response(
          JSON.stringify({ tickets: tickets || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start_impersonation': {
        if (!body.targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is master
        const { data: masterCheck } = await supabase.rpc('is_master', { _user_id: body.targetUserId });
        if (masterCheck) {
          return new Response(
            JSON.stringify({ error: 'Não é possível impersonar o usuário master' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get target user data for impersonation session
        const { data: userData, error } = await supabase.auth.admin.getUserById(body.targetUserId);
        if (error) throw error;

        await logAudit('impersonate', body.targetUserId, null, { started: true });

        // Return user info - actual impersonation will be handled client-side
        return new Response(
          JSON.stringify({ 
            success: true,
            targetUser: {
              id: userData.user.id,
              email: userData.user.email,
            },
            impersonationToken: `imp_${Date.now()}_${body.targetUserId}` // Token for tracking
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Erro na função admin-users:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
