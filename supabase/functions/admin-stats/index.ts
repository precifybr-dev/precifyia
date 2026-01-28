import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verificar autenticação
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

    // Verificar token do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é colaborador com permissão view_metrics
    const { data: hasPermission } = await supabase.rpc('has_permission', {
      _user_id: user.id,
      _permission: 'view_metrics'
    });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para acessar métricas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados de auth.users usando service role
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      throw usersError;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allUsers = users.users || [];
    
    const totalUsers = allUsers.length;
    const usersToday = allUsers.filter(u => new Date(u.created_at) >= oneDayAgo).length;
    const usersWeek = allUsers.filter(u => new Date(u.created_at) >= oneWeekAgo).length;
    const usersMonth = allUsers.filter(u => new Date(u.created_at) >= oneMonthAgo).length;

    // Buscar dados de planos
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_plan');

    const basicPlanUsers = profiles?.filter(p => p.user_plan === 'basic').length || 0;
    const proPlanUsers = profiles?.filter(p => p.user_plan === 'pro').length || 0;
    const freePlanUsers = profiles?.filter(p => !p.user_plan || p.user_plan === 'free').length || 0;

    // Calcular estatísticas de registro por dia (últimos 30 dias)
    const registrationStats: Record<string, number> = {};
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      registrationStats[dateStr] = 0;
    }

    allUsers.forEach(u => {
      const dateStr = new Date(u.created_at).toISOString().split('T')[0];
      if (registrationStats[dateStr] !== undefined) {
        registrationStats[dateStr]++;
      }
    });

    const registrationData = Object.entries(registrationStats)
      .map(([date, count]) => ({
        registration_date: date,
        user_count: count
      }))
      .sort((a, b) => a.registration_date.localeCompare(b.registration_date));

    // Usuários recentes
    const recentUsers = allUsers
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at
      }));

    // Enriquecer com dados de profile
    const userIds = recentUsers.map(u => u.id);
    const { data: userProfiles } = await supabase
      .from('profiles')
      .select('user_id, business_name, user_plan, onboarding_step')
      .in('user_id', userIds);

    const enrichedRecentUsers = recentUsers.map(u => {
      const profile = userProfiles?.find(p => p.user_id === u.id);
      return {
        ...u,
        business_name: profile?.business_name || null,
        user_plan: profile?.user_plan || 'free',
        onboarding_step: profile?.onboarding_step || null
      };
    });

    // Calcular MRR
    const BASIC_PRICE = 29.90;
    const PRO_PRICE = 59.90;
    
    const mrrStats = [
      { plan_type: 'pro', user_count: proPlanUsers, mrr: proPlanUsers * PRO_PRICE },
      { plan_type: 'basic', user_count: basicPlanUsers, mrr: basicPlanUsers * BASIC_PRICE },
      { plan_type: 'free', user_count: freePlanUsers, mrr: 0 }
    ];

    const totalMRR = mrrStats.reduce((sum, s) => sum + s.mrr, 0);
    const arpu = totalUsers > 0 ? totalMRR / totalUsers : 0;
    const averageLTV = arpu * 12;

    return new Response(
      JSON.stringify({
        metrics: {
          total_users: totalUsers,
          users_today: usersToday,
          users_week: usersWeek,
          users_month: usersMonth,
          basic_plan_users: basicPlanUsers,
          pro_plan_users: proPlanUsers,
          free_plan_users: freePlanUsers
        },
        mrrStats,
        registrationStats: registrationData,
        recentUsers: enrichedRecentUsers,
        calculated: {
          totalMRR,
          arpu,
          averageLTV,
          churnRate: 0 // TODO: calcular quando tivermos dados de cancelamento
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função admin-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
