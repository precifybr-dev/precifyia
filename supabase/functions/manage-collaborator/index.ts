import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type AppRole = 'user' | 'admin' | 'master' | 'suporte' | 'financeiro' | 'analista';

interface CreateCollaboratorRequest {
  action: 'create';
  email: string;
  name: string;
  role: AppRole;
  password: string;
}

interface UpdateCollaboratorRequest {
  action: 'update';
  collaboratorId: string;
  updates: {
    name?: string;
    role?: AppRole;
    is_active?: boolean;
  };
}

interface ResetPasswordRequest {
  action: 'reset_password';
  userId: string;
  newPassword: string;
}

interface Reset2FARequest {
  action: 'reset_2fa';
  userId: string;
}

type RequestBody = CreateCollaboratorRequest | UpdateCollaboratorRequest | ResetPasswordRequest | Reset2FARequest;

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

    // Verificar se o usuário atual é master
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Rate Limiting: 10 req/min (rota crítica de gestão) ───
    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      _key: user.id, _endpoint: "manage-collaborator", _max_requests: 10, _window_seconds: 60, _block_seconds: 180,
    });
    const rl = rlData?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em breve.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry_after_seconds) } }
      );
    }

    // Verificar se é master
    const { data: masterRole } = await supabase
      .from('user_roles')
      .select('role, is_protected')
      .eq('user_id', user.id)
      .eq('role', 'master')
      .maybeSingle();

    const isMaster = masterRole?.role === 'master' && masterRole?.is_protected;

    if (!isMaster) {
      // Registrar tentativa de acesso não autorizado
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        action: 'unauthorized_collaborator_management_attempt',
        action_type: 'security',
        new_value: { attempted_action: 'manage_collaborator', ip: req.headers.get('x-forwarded-for') },
      });

      console.error(`[SECURITY] Unauthorized access attempt by user ${user.id}`);

      return new Response(
        JSON.stringify({ error: 'Apenas o usuário master pode gerenciar colaboradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();

    // Validação adicional: impedir que master tente criar/promover para master
    if (body.action === 'create' && body.role === 'master') {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        action: 'master_creation_attempt_blocked',
        action_type: 'security',
        new_value: { attempted_email: body.email, attempted_role: body.role },
      });
      
      return new Response(
        JSON.stringify({ error: 'Não é permitido criar outro usuário master' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'update' && body.updates?.role === 'master') {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        action: 'master_promotion_attempt_blocked',
        action_type: 'security',
        new_value: { collaborator_id: body.collaboratorId, attempted_role: body.updates.role },
      });
      
      return new Response(
        JSON.stringify({ error: 'Não é permitido promover para master' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'create') {
      return await handleCreateCollaborator(supabase, body, user.id);
    } else if (body.action === 'update') {
      return await handleUpdateCollaborator(supabase, body, user.id);
    } else if (body.action === 'reset_password') {
      return await handleResetPassword(supabase, body, user.id);
    } else if (body.action === 'reset_2fa') {
      return await handleReset2FA(supabase, body, user.id);
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função manage-collaborator:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreateCollaborator(
  supabase: any,
  data: CreateCollaboratorRequest,
  createdBy: string
) {
  const { email, name, role, password } = data;

  // Validar role (não pode criar outro master)
  if (role === 'master') {
    return new Response(
      JSON.stringify({ error: 'Não é possível criar outro usuário master' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Criar usuário no auth
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      is_collaborator: true,
    }
  });

  if (createError) {
    console.error('Erro ao criar usuário:', createError);
    return new Response(
      JSON.stringify({ error: 'Erro ao criar usuário: ' + createError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Criar registro de colaborador
  const { error: collaboratorError } = await supabase
    .from('collaborators')
    .insert({
      user_id: newUser.user.id,
      role,
      name,
      email,
      is_active: true,
      created_by: createdBy,
    });

  if (collaboratorError) {
    // Rollback: deletar usuário criado
    await supabase.auth.admin.deleteUser(newUser.user.id);
    return new Response(
      JSON.stringify({ error: 'Erro ao criar colaborador: ' + collaboratorError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Criar role do usuário
  await supabase
    .from('user_roles')
    .insert({
      user_id: newUser.user.id,
      role,
      is_protected: false,
    });

  // Configurar segurança (forçar troca de senha no primeiro login)
  await supabase
    .from('user_security')
    .insert({
      user_id: newUser.user.id,
      must_change_password: true,
      mfa_enabled: false,
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      collaborator: {
        id: newUser.user.id,
        email,
        name,
        role,
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateCollaborator(
  supabase: any,
  data: UpdateCollaboratorRequest,
  masterId: string
) {
  const { collaboratorId, updates } = data;

  // Verificar se está tentando alterar para master
  if (updates.role === 'master') {
    return new Response(
      JSON.stringify({ error: 'Não é possível promover para master' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verificar se o colaborador existe e não é master
  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('role, user_id')
    .eq('id', collaboratorId)
    .single();

  if (!collaborator) {
    return new Response(
      JSON.stringify({ error: 'Colaborador não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (collaborator.role === 'master') {
    return new Response(
      JSON.stringify({ error: 'Não é possível alterar o usuário master' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Atualizar colaborador
  const { error } = await supabase
    .from('collaborators')
    .update(updates)
    .eq('id', collaboratorId);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Erro ao atualizar: ' + error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Se a role foi alterada, atualizar também na tabela user_roles
  if (updates.role) {
    await supabase
      .from('user_roles')
      .update({ role: updates.role })
      .eq('user_id', collaborator.user_id);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleResetPassword(
  supabase: any,
  data: ResetPasswordRequest,
  masterId: string
) {
  const { userId, newPassword } = data;

  // Verificar se não é o master
  const { data: masterRole } = await supabase
    .from('user_roles')
    .select('role, is_protected')
    .eq('user_id', userId)
    .eq('role', 'master')
    .maybeSingle();

  if (masterRole?.is_protected) {
    return new Response(
      JSON.stringify({ error: 'Não é possível resetar a senha do master por este método' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Erro ao resetar senha: ' + error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Marcar que precisa trocar senha
  await supabase
    .from('user_security')
    .upsert({
      user_id: userId,
      must_change_password: true,
    }, { onConflict: 'user_id' });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleReset2FA(
  supabase: any,
  data: Reset2FARequest,
  masterId: string
) {
  const { userId } = data;

  // Verificar se não é o master
  const { data: masterRole } = await supabase
    .from('user_roles')
    .select('role, is_protected')
    .eq('user_id', userId)
    .eq('role', 'master')
    .maybeSingle();

  if (masterRole?.is_protected) {
    return new Response(
      JSON.stringify({ error: 'Não é possível resetar o 2FA do master por este método' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Resetar 2FA
  const { error } = await supabase
    .from('user_security')
    .update({
      mfa_enabled: false,
      mfa_verified: false,
      mfa_secret: null,
      last_mfa_code: null,
      mfa_code_expires_at: null,
    })
    .eq('user_id', userId);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Erro ao resetar 2FA: ' + error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
