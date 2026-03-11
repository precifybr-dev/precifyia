import { supabase } from "@/integrations/supabase/client";

interface LogAccessParams {
  action: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export async function logAccessAttempt({ action, success, metadata = {} }: LogAccessParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("Cannot log access: no authenticated user");
      return;
    }

    // Collect client information
    const clientInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: "America/Sao_Paulo",
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
      origin: window.location.origin,
    };

    const { error } = await supabase.from("access_logs").insert({
      user_id: session.user.id,
      action,
      success,
      user_agent: navigator.userAgent,
      metadata: {
        ...metadata,
        clientInfo,
      },
    });

    if (error) {
      console.error("Failed to log access attempt:", error);
    }
  } catch (err) {
    console.error("Error logging access attempt:", err);
  }
}

export function useAccessLogger() {
  return { logAccessAttempt };
}
