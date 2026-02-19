import { useCallback } from "react";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import { trackGAEvent } from "@/hooks/useGoogleAnalytics";

/**
 * Centralized upgrade funnel tracking.
 * Logs to both funnel_events (DB) and GA4.
 */
export function useUpgradeTracking() {
  const { trackEvent } = useFunnelTracking();

  const trackUpgradeViewed = useCallback(
    (source: string) => {
      trackEvent("upgrade_prompt_viewed", source, { source });
      trackGAEvent("upgrade_prompt_viewed", { source });
    },
    [trackEvent]
  );

  const trackUpgradeClicked = useCallback(
    (source: string, targetPlan?: string) => {
      trackEvent("upgrade_cta_clicked", source, { source, target_plan: targetPlan });
      trackGAEvent("upgrade_cta_clicked", { source, target_plan: targetPlan || "" });
    },
    [trackEvent]
  );

  const trackUpgradeDismissed = useCallback(
    (source: string) => {
      trackEvent("upgrade_prompt_dismissed", source, { source });
      trackGAEvent("upgrade_prompt_dismissed", { source });
    },
    [trackEvent]
  );

  const trackFeatureBlocked = useCallback(
    (feature: string) => {
      trackEvent("feature_blocked", feature, { feature });
      trackGAEvent("feature_blocked", { feature });
    },
    [trackEvent]
  );

  const trackLimitReached = useCallback(
    (feature: string, used: number, limit: number) => {
      trackEvent("limit_reached", feature, { feature, used, limit });
      trackGAEvent("limit_reached", { feature, used: String(used), limit: String(limit) });
    },
    [trackEvent]
  );

  const trackMilestone = useCallback(
    (milestone: string, metadata?: Record<string, unknown>) => {
      trackEvent("milestone_reached", milestone, { milestone, ...metadata });
      trackGAEvent("milestone_reached", { milestone });
    },
    [trackEvent]
  );

  return {
    trackUpgradeViewed,
    trackUpgradeClicked,
    trackUpgradeDismissed,
    trackFeatureBlocked,
    trackLimitReached,
    trackMilestone,
  };
}
