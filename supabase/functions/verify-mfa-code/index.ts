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
    
    const { userId, code }: VerifyRequest = await req.json();
    
    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: 'userId e code são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
