import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventCategory = "auth" | "navigation" | "feature" | "export" | "data";

interface TrackEventOptions {
  category?: EventCategory;
  metadata?: Record<string, any>;
}

// Generate a unique session ID
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID from sessionStorage
const getSessionId = (): string => {
  const key = "platform_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
};

export function useEventTracking() {
  const sessionIdRef = useRef<string>(getSessionId());
  const sessionStartRef = useRef<Date>(new Date());
  const pageViewsRef = useRef<number>(0);
  const eventsCountRef = useRef<number>(0);

  // Track an event
  const trackEvent = useCallback(
    async (eventType: string, options: TrackEventOptions = {}) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        eventsCountRef.current += 1;

        const { error } = await supabase.from("platform_events").insert({
          user_id: session.user.id,
          event_type: eventType,
          event_category: options.category || "general",
          metadata: options.metadata || {},
          session_id: sessionIdRef.current,
        });

        if (error) {
          console.error("Error tracking event:", error);
        }
      } catch (err) {
        console.error("Error tracking event:", err);
      }
    },
    []
  );

  // Track page view
  const trackPageView = useCallback(
    async (pageName: string) => {
      pageViewsRef.current += 1;
      await trackEvent("page_view", {
        category: "navigation",
        metadata: { page: pageName },
      });
    },
    [trackEvent]
  );

  // Track login
  const trackLogin = useCallback(async () => {
    await trackEvent("login", { category: "auth" });
  }, [trackEvent]);

  // Track dashboard access
  const trackDashboardAccess = useCallback(async () => {
    await trackEvent("dashboard_access", { category: "navigation" });
  }, [trackEvent]);

  // Track report creation
  const trackReportCreation = useCallback(
    async (reportType: string) => {
      await trackEvent("report_created", {
        category: "feature",
        metadata: { report_type: reportType },
      });
    },
    [trackEvent]
  );

  // Track export
  const trackExport = useCallback(
    async (exportType: string, format: string) => {
      await trackEvent("export", {
        category: "export",
        metadata: { export_type: exportType, format },
      });
    },
    [trackEvent]
  );

  // Track data changes
  const trackDataChange = useCallback(
    async (entityType: string, action: "create" | "update" | "delete") => {
      await trackEvent(`${entityType}_${action}`, {
        category: "data",
        metadata: { entity: entityType, action },
      });
    },
    [trackEvent]
  );

  // Track feature usage
  const trackFeatureUsage = useCallback(
    async (featureName: string, metadata?: Record<string, any>) => {
      await trackEvent(featureName, {
        category: "feature",
        metadata,
      });
    },
    [trackEvent]
  );

  // Start session tracking
  const startSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from("user_sessions")
        .select("id")
        .eq("session_id", sessionIdRef.current)
        .maybeSingle();

      if (!existingSession) {
        await supabase.from("user_sessions").insert({
          user_id: session.user.id,
          session_id: sessionIdRef.current,
          started_at: sessionStartRef.current.toISOString(),
        });
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  }, []);

  // End session tracking
  const endSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const now = new Date();
      const durationSeconds = Math.floor(
        (now.getTime() - sessionStartRef.current.getTime()) / 1000
      );

      await supabase
        .from("user_sessions")
        .update({
          ended_at: now.toISOString(),
          duration_seconds: durationSeconds,
          page_views: pageViewsRef.current,
          events_count: eventsCountRef.current,
        })
        .eq("session_id", sessionIdRef.current);
    } catch (err) {
      console.error("Error ending session:", err);
    }
  }, []);

  // Track session on mount/unmount and beforeunload
  useEffect(() => {
    startSession();

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable unload tracking
      const durationSeconds = Math.floor(
        (new Date().getTime() - sessionStartRef.current.getTime()) / 1000
      );

      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?session_id=eq.${sessionIdRef.current}`,
        JSON.stringify({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          page_views: pageViewsRef.current,
          events_count: eventsCountRef.current,
        })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession();
    };
  }, [startSession, endSession]);

  return {
    trackEvent,
    trackPageView,
    trackLogin,
    trackDashboardAccess,
    trackReportCreation,
    trackExport,
    trackDataChange,
    trackFeatureUsage,
  };
}
