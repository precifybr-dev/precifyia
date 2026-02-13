import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Disposable/temporary email domains blocklist
const BLOCKED_DOMAINS = new Set([
  "tempmail.com", "throwaway.email", "guerrillamail.com", "guerrillamail.net",
  "mailinator.com", "yopmail.com", "10minutemail.com", "trashmail.com",
  "dispostable.com", "maildrop.cc", "mailnesia.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "tempail.com", "tempr.email", "temp-mail.org",
  "fakeinbox.com", "tmpmail.net", "tmpmail.org", "boun.cr", "discard.email",
  "discardmail.com", "discardmail.de", "emailondeck.com", "getairmail.com",
  "harakirimail.com", "mailexpire.com", "mailforspam.com", "mailnull.com",
  "mailsac.com", "mailscrap.com", "mailshell.com", "mailzilla.com",
  "meltmail.com", "mobi.web.id", "mytemp.email", "nomail.xl.cx",
  "objectmail.com", "proxymail.eu", "rcpt.at", "spamgourmet.com",
  "spamhereplease.com", "spaml.com", "tempomail.fr", "temporarymail.com",
  "throwam.com", "trash-mail.at", "trashmail.io", "trashmail.me",
  "trashmail.net", "wegwerfmail.de", "wegwerfmail.net", "wh4f.org",
  "yopmail.fr", "yopmail.net", "jetable.org", "link2mail.net",
  "trash-me.com", "filzmail.com", "getnada.com", "mailcatch.com",
  "tempmailo.com", "burnermail.io", "inboxbear.com", "mohmal.com",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generic error message — never reveal if email exists
  const GENERIC_SUCCESS = "Se o email não estiver cadastrado, você receberá um link de confirmação em breve.";
  const GENERIC_ERROR = "Não foi possível processar sua solicitação. Tente novamente mais tarde.";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // ─── 1. Rate limit by IP ───
    const { data: rlAllowed } = await supabaseAdmin.rpc("check_signup_limit", {
      _ip: clientIp,
    });

    if (rlAllowed === false) {
      // Log blocked attempt
      await supabaseAdmin.from("rate_limit_global").insert({
        ip: clientIp,
        endpoint: "secure-signup-blocked",
        user_id: null,
        fingerprint_hash: null,
      });

      return new Response(
        JSON.stringify({ message: GENERIC_SUCCESS }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 2. Parse and validate input ───
    const rawBody = await req.json();
    const email = typeof rawBody.email === "string" ? rawBody.email.trim().toLowerCase() : null;
    const password = typeof rawBody.password === "string" ? rawBody.password : null;
    const fullName = typeof rawBody.full_name === "string" ? rawBody.full_name.trim() : "";
    const businessName = typeof rawBody.business_name === "string" ? rawBody.business_name.trim() : "";
    const turnstileToken = typeof rawBody.turnstile_token === "string" ? rawBody.turnstile_token : null;

    // ─── 2b. Validate Cloudflare Turnstile CAPTCHA ───
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      if (!turnstileToken) {
        // No token = silent block (generic message)
        return new Response(
          JSON.stringify({ message: GENERIC_SUCCESS }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: clientIp,
        }),
      });

      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        // Failed CAPTCHA = silent block (generic message)
        await supabaseAdmin.from("rate_limit_global").insert({
          ip: clientIp,
          endpoint: "secure-signup-captcha-failed",
          user_id: null,
          fingerprint_hash: null,
        });

        return new Response(
          JSON.stringify({ message: GENERIC_SUCCESS }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password length validation
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 3. Block disposable email domains ───
    const domain = email.split("@")[1];
    if (BLOCKED_DOMAINS.has(domain)) {
      // Log attempt but return generic success (don't reveal detection)
      await supabaseAdmin.from("rate_limit_global").insert({
        ip: clientIp,
        endpoint: "secure-signup-disposable-blocked",
        user_id: null,
        fingerprint_hash: domain,
      });

      return new Response(
        JSON.stringify({ message: GENERIC_SUCCESS }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 4. Log signup attempt for rate limiting ───
    await supabaseAdmin.from("rate_limit_global").insert({
      ip: clientIp,
      endpoint: "secure-signup",
      user_id: null,
      fingerprint_hash: null,
    });

    // ─── 5. Create user via admin API ───
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        business_name: businessName,
      },
    });

    if (error) {
      // If user already exists or any other error, return generic message
      // Never reveal whether the email is already registered
      console.error("Signup error (hidden from user):", error.message);

      return new Response(
        JSON.stringify({ message: GENERIC_SUCCESS }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 6. Send confirmation email ───
    // Generate a magic link / confirmation for the user
    if (data?.user) {
      const { error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}`,
        },
      });

      if (inviteError) {
        console.error("Confirmation email error:", inviteError.message);
      }
    }

    // Always return generic success
    return new Response(
      JSON.stringify({ message: GENERIC_SUCCESS, success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("secure-signup error:", error);
    return new Response(
      JSON.stringify({ error: GENERIC_ERROR }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
