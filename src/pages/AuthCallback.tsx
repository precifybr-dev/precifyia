import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { determineLoginRedirect } from "@/hooks/useUserRole";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verificando sessão...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          navigate("/login");
          return;
        }

        if (!session?.user) {
          // No session, redirect to login
          navigate("/login");
          return;
        }

        setStatus("Verificando perfil...");

        // Check if user needs security verification (for master users)
        const { data: securityData } = await supabase
          .from("user_security")
          .select("must_change_password, mfa_enabled, mfa_verified")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, is_protected")
          .eq("user_id", session.user.id)
          .eq("role", "master")
          .maybeSingle();

        const isMaster = roleData?.role === "master" && roleData?.is_protected;
        const needsPasswordChange = securityData?.must_change_password;
        const needsMfaVerification = isMaster && securityData?.mfa_enabled && !securityData?.mfa_verified;

        // If security check needed, redirect there
        if (needsPasswordChange || needsMfaVerification) {
          navigate("/security-check");
          return;
        }

        setStatus("Determinando destino...");

        // Determine redirect based on role
        const redirectPath = await determineLoginRedirect(session.user.id);

        // For end users, also check onboarding status
        if (redirectPath === "/app") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_step")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!profile || profile.onboarding_step !== "completed") {
            navigate("/onboarding");
            return;
          }
        }

        // Navigate to the appropriate dashboard
        navigate(redirectPath);
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/login");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
