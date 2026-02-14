import { supabase } from "@/integrations/supabase/client";

const ANON_ID_KEY = "precify_anon_id";

function getAnonymousId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

export function useFunnelTracking() {
  const trackEvent = async (
    eventType: string,
    ctaId?: string,
    extraMetadata?: Record<string, unknown>
  ) => {
    try {
      const anonymousId = getAnonymousId();
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id || null;

      const metadata: Record<string, unknown> = {
        ...getUtmParams(),
        referrer: document.referrer || null,
        url: window.location.href,
        ...extraMetadata,
      };

      await supabase.from("funnel_events").insert([{
        anonymous_id: anonymousId,
        user_id: userId,
        event_type: eventType,
        cta_id: ctaId || null,
        metadata: metadata as any,
      }]);
    } catch (e) {
      // Silently fail — tracking should never block UX
      console.warn("Funnel tracking error:", e);
    }
  };

  return { trackEvent };
}
