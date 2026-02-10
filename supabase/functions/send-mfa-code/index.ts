import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MFARequest {
  email: string;
  userId: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    // ─── MASS ASSIGNMENT PROTECTION: Only allow email and userId ───
    const email = typeof rawBody.email === 'string' ? rawBody.email.trim() : null;
    const userId = typeof rawBody.userId === 'string' ? rawBody.userId.trim() : null;

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── OWNERSHIP: Validate userId matches the email in auth.users ───
    // Never trust IDs from frontend — verify the userId actually belongs to this email
    const { data: authUser, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
    if (authLookupError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
      console.error(`[SECURITY] MFA ownership mismatch: userId=${userId} email=${email} actual=${authUser.user.email}`);
      return new Response(
        JSON.stringify({ error: 'Dados de autenticação inconsistentes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Rate Limiting: 5 req/min por usuário, 10 req/min por IP (anti-brute-force) ───
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [{ data: userRL }, { data: ipRL }] = await Promise.all([
      supabase.rpc("check_rate_limit", { _key: userId, _endpoint: "send-mfa", _max_requests: 5, _window_seconds: 60, _block_seconds: 300 }),
      supabase.rpc("check_rate_limit", { _key: `ip:${clientIp}`, _endpoint: "send-mfa", _max_requests: 10, _window_seconds: 60, _block_seconds: 300 }),
    ]);
    const rl = userRL?.[0] || ipRL?.[0];
    if (rl && !rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rl.retry_after_seconds) } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Gerar código de 6 dígitos
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar código no banco
    const { error: updateError } = await supabase
      .from('user_security')
      .upsert({
        user_id: userId,
        last_mfa_code: code,
        mfa_code_expires_at: expiresAt.toISOString(),
        mfa_enabled: true,
      }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('Erro ao salvar código MFA:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código de verificação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar email com Resend se configurado
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PRECIFY <noreply@precify.com.br>',
          to: [email],
          subject: 'Código de Verificação - PRECIFY',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">PRECIFY</h1>
              <h2>Código de Verificação</h2>
              <p>Use o código abaixo para completar seu login:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
              </div>
              <p style="color: #6b7280;">Este código expira em 10 minutos.</p>
              <p style="color: #6b7280;">Se você não solicitou este código, ignore este email.</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Erro ao enviar email:', await emailResponse.text());
      }
    } else {
      // Log do código para desenvolvimento (remover em produção)
      console.log(`[DEV] Código MFA para ${email}: ${code}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado para seu email',
        // Retornar código apenas em dev (remover em produção)
        ...(resendApiKey ? {} : { devCode: code })
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função send-mfa-code:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
