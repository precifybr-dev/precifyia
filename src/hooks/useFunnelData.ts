import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FunnelStep {
  label: string;
  eventType: string;
  count: number;
  percentage: number;
  dropoff: number;
}

interface CtaPerformance {
  cta_id: string;
  clicks: number;
  signups: number;
  conversionRate: number;
}

interface FunnelEvent {
  id: string;
  anonymous_id: string;
  user_id: string | null;
  event_type: string;
  cta_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ReferralSourceData {
  source: string;
  label: string;
  count: number;
  percentage: number;
}

const REFERRAL_LABELS: Record<string, string> = {
  google: "Google / Pesquisa",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  indicacao: "Indicação",
  ifood: "Pesquisa iFood",
  blog: "Blog / Artigo",
  outro: "Outro",
};

export function useFunnelData(periodDays: number = 30) {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [ctaPerformance, setCtaPerformance] = useState<CtaPerformance[]>([]);
  const [recentEvents, setRecentEvents] = useState<FunnelEvent[]>([]);
  const [referralSources, setReferralSources] = useState<ReferralSourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalCtaClicks: 0,
    ctaToSignupRate: 0,
    trialToPaymentRate: 0,
    cartAbandonRate: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - periodDays);
      const sinceStr = since.toISOString();

      // Fetch all events in period
      const { data: events } = await supabase
        .from("funnel_events")
        .select("*")
        .gte("created_at", sinceStr)
        .order("created_at", { ascending: false });

      if (!events) {
        setIsLoading(false);
        return;
      }

      // Count by event type
      const counts: Record<string, number> = {};
      for (const e of events) {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      }

      const funnelOrder = [
        { label: "Clicaram CTA", eventType: "cta_click" },
        { label: "Abriram cadastro", eventType: "signup_started" },
        { label: "Criaram conta", eventType: "signup_completed" },
        { label: "Iniciaram trial", eventType: "trial_started" },
        { label: "Abriram carrinho", eventType: "checkout_opened" },
        { label: "Pagamento finalizado", eventType: "payment_completed" },
      ];

      const topCount = counts[funnelOrder[0].eventType] || 1;
      const funnelSteps: FunnelStep[] = funnelOrder.map((step, i) => {
        const count = counts[step.eventType] || 0;
        const prevCount = i > 0 ? (counts[funnelOrder[i - 1].eventType] || 0) : count;
        const percentage = topCount > 0 ? (count / topCount) * 100 : 0;
        const dropoff = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
        return { ...step, count, percentage, dropoff };
      });
      setSteps(funnelSteps);

      // CTA performance
      const ctaClicks = events.filter((e) => e.event_type === "cta_click");
      const signups = events.filter((e) => e.event_type === "signup_completed");
      const ctaMap: Record<string, { clicks: number; signups: number }> = {};

      for (const e of ctaClicks) {
        const id = e.cta_id || "unknown";
        if (!ctaMap[id]) ctaMap[id] = { clicks: 0, signups: 0 };
        ctaMap[id].clicks++;
      }

      // Approximate: attribute signups to the anonymous_id's last CTA click
      const anonToCta: Record<string, string> = {};
      for (const e of ctaClicks) {
        anonToCta[e.anonymous_id] = e.cta_id || "unknown";
      }
      for (const e of signups) {
        const ctaId = anonToCta[e.anonymous_id];
        if (ctaId && ctaMap[ctaId]) ctaMap[ctaId].signups++;
      }

      const ctaPerf = Object.entries(ctaMap)
        .map(([cta_id, data]) => ({
          cta_id,
          clicks: data.clicks,
          signups: data.signups,
          conversionRate: data.clicks > 0 ? (data.signups / data.clicks) * 100 : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks);
      setCtaPerformance(ctaPerf);

      // KPIs
      const totalCtaClicks = counts["cta_click"] || 0;
      const totalSignups = counts["signup_completed"] || 0;
      const totalTrials = counts["trial_started"] || 0;
      const totalCheckout = counts["checkout_opened"] || 0;
      const totalPayments = counts["payment_completed"] || 0;

      setKpis({
        totalCtaClicks,
        ctaToSignupRate: totalCtaClicks > 0 ? (totalSignups / totalCtaClicks) * 100 : 0,
        trialToPaymentRate: totalTrials > 0 ? (totalPayments / totalTrials) * 100 : 0,
        cartAbandonRate: totalCheckout > 0 ? ((totalCheckout - totalPayments) / totalCheckout) * 100 : 0,
      });

      // Recent events (last 50)
      setRecentEvents(events.slice(0, 50) as FunnelEvent[]);

      // Fetch referral sources from profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("referral_source")
        .not("referral_source", "is", null);

      if (profiles) {
        const srcCounts: Record<string, number> = {};
        for (const p of profiles) {
          const src = p.referral_source || "unknown";
          srcCounts[src] = (srcCounts[src] || 0) + 1;
        }
        const total = profiles.length || 1;
        const srcData = Object.entries(srcCounts)
          .map(([source, count]) => ({
            source,
            label: REFERRAL_LABELS[source] || source,
            count,
            percentage: (count / total) * 100,
          }))
          .sort((a, b) => b.count - a.count);
        setReferralSources(srcData);
      }
    } catch (e) {
      console.error("Error fetching funnel data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { steps, ctaPerformance, recentEvents, referralSources, kpis, isLoading, refetch: fetchData };
}
