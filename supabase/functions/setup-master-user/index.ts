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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar se o usuário master já existe
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const masterUser = existingUsers.users.find(u => u.email === MASTER_EMAIL);

    if (masterUser) {
      // Verificar se já tem role master configurado
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', masterUser.id)
        .eq('role', 'master')
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ message: 'Usuário master já configurado', userId: masterUser.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Configurar role e segurança para usuário existente
      await setupMasterUser(supabase, masterUser.id);

      return new Response(
        JSON.stringify({ message: 'Configuração master aplicada ao usuário existente', userId: masterUser.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar novo usuário master
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: '10203040',
      email_confirm: true,
      user_metadata: {
        full_name: 'Master PRECIFY',
        is_master: true,
      }
    });

    if (createError) {
      console.error('Erro ao criar usuário master:', createError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário master: ' + createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configurar role e segurança
    await setupMasterUser(supabase, newUser.user.id);

    return new Response(
      JSON.stringify({ 
        message: 'Usuário master criado com sucesso', 
        userId: newUser.user.id,
        email: MASTER_EMAIL,
        temporaryPassword: '10203040'
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

  // Configurar segurança - forçar troca de senha e MFA
  await supabase
    .from('user_security')
    .upsert({
      user_id: userId,
      must_change_password: true,
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
