import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Replace with your actual GA4 Measurement ID
const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function trackGAEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

export function useGoogleAnalytics() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return { trackGAEvent };
}
