import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ArrowRight, TrendingUp, Zap, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePublicPricing, type PricingPlan } from "@/hooks/useStrategicPricing";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanComparisonTable } from "@/components/plan/PlanComparisonTableStrategic";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";
import { useUpgradeTracking } from "@/hooks/useUpgradeTracking";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PLAN_SLUG_MAP: Record<string, string> = {
  teste: "free",
  essencial: "basic",
  pro: "pro",
};

const PLAN_META: Record<string, { icon: typeof Zap; tagline: string; maturityLabel: string }> = {
  free: {
    icon: Shield,
    tagline: "Visualização estratégica inicial",
    maturityLabel: "Operação inicial",
  },
  basic: {
    icon: Zap,
    tagline: "Organize sua operação com estrutura",
    maturityLabel: "Gestão organizada",
  },
  pro: {
    icon: TrendingUp,
    tagline: "Transforme margem em crescimento previsível",
    maturityLabel: "Gestão estratégica com escala",
  },
};

const fallbackPlans: PricingPlan[] = [
  {
    id: "teste", name: "Teste", description: "Visualização estratégica inicial",
    real_price_monthly: 0, anchored_price_monthly: 0,
    real_price_yearly: 0, anchored_price_yearly: 0, yearly_discount_percent: 0,
    features: [
      { text: "Até 2 fichas técnicas", included: true },
      { text: "Até 35 insumos", included: true },
      { text: "Dashboard básico", included: true },
      { text: "1 análise de cardápio (uso total)", included: true },
      { text: "1 combo estratégico (uso total)", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 0,
  },
  {
    id: "essencial", name: "Essencial", description: "Organize sua operação com estrutura",
    real_price_monthly: 97, anchored_price_monthly: 147,
    real_price_yearly: 932, anchored_price_yearly: 1411, yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Teste, mais:", included: true },
      { text: "Até 8 fichas técnicas", included: true },
      { text: "Até 100 insumos", included: true },
      { text: "Dashboard completo", included: true },
      { text: "Até 5 análises de cardápio/mês", included: true },
      { text: "Até 3 combos estratégicos/mês", included: true },
      { text: "Sub-receitas incluso", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 1,
  },
  {
    id: "pro", name: "Pro", description: "Transforme margem em crescimento previsível",
    real_price_monthly: 147, anchored_price_monthly: 297,
    real_price_yearly: 1411, anchored_price_yearly: 2851, yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Essencial, mais:", included: true },
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Insumos ilimitados", included: true },
      { text: "Dashboard avançado + DRE", included: true },
      { text: "Até 10 análises de cardápio/mês", included: true },
      { text: "Até 3 lojas", included: true },
      { text: "Colaboradores + WhatsApp", included: true },
    ],
    is_popular: true, is_active: true, sort_order: 2,
  },
];

function formatPrice(value: number) {
  if (value <= 0) return "Grátis";
  return `R$ ${Math.round(value)}`;
}

export function PlansTab() {
  const { plans: dbPlans } = usePublicPricing();
  const { userPlan } = usePlanFeatures();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string>("pro");
  const { trackUpgradeViewed, trackUpgradeClicked } = useUpgradeTracking();
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const hasTrackedScroll = useRef(false);

  const plans = dbPlans.length > 0 ? dbPlans : fallbackPlans;

  // Reorder: Teste, PRO (center), Essencial → visually: Teste | PRO | Essencial
  // Actually per brief: PRO in center = order Teste, PRO, Essencial on desktop
  const orderedPlans = (() => {
    const teste = plans.find(p => getPlanSlug(p) === "free");
    const essencial = plans.find(p => getPlanSlug(p) === "basic");
    const pro = plans.find(p => getPlanSlug(p) === "pro");
    // Desktop: Essencial | PRO (center, highlighted) | Teste (reference)
    // But brief says PRO center → Teste | PRO | Essencial
    return [teste, pro, essencial].filter(Boolean) as PricingPlan[];
  })();

  // Track plan_view
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackUpgradeViewed("plans_tab");
      trackGAAndFunnel("plan_view");
    }
  }, []);

  // Track scroll 75%
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedScroll.current) {
          hasTrackedScroll.current = true;
          trackGAAndFunnel("plan_scroll_75");
        }
      },
      { threshold: 0.75 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function getPlanSlug(plan: PricingPlan) {
    return PLAN_SLUG_MAP[plan.id?.toLowerCase()] || PLAN_SLUG_MAP[plan.name?.toLowerCase()] || plan.id;
  }

  const isCurrentPlan = (plan: PricingPlan) => getPlanSlug(plan) === userPlan;

  const isLowerPlan = (plan: PricingPlan) => {
    const order: Record<string, number> = { free: 0, basic: 1, pro: 2 };
    const slug = getPlanSlug(plan);
    return (order[slug] ?? 0) < (order[userPlan] ?? 0);
  };

  function trackGAAndFunnel(event: string, extra?: Record<string, string>) {
    import("@/hooks/useGoogleAnalytics").then(m => m.trackGAEvent(event, extra));
    import("@/hooks/useFunnelTracking").then(async m => {
      const { trackEvent } = m.useFunnelTracking();
      trackEvent(event, undefined, extra);
    });
  }

  const handleCtaClick = (slug: string) => {
    const event = slug === "pro" ? "plan_cta_pro_click" : "plan_cta_essencial_click";
    trackGAAndFunnel(event);
    trackUpgradeClicked("plans_tab", slug);
    setUpgradeTarget(slug);
    setShowUpgrade(true);
  };

  const handleCompareClick = () => {
    trackGAAndFunnel("plan_compare_click");
  };

  return (
    <TooltipProvider>
      <div className="space-y-8" ref={sectionRef}>
        {/* Recommended plan banner for Teste users */}
        {userPlan === "free" && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Plano recomendado com base na sua estrutura
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Você já demonstrou clareza sobre a sua operação. O próximo passo natural é desbloquear a estrutura completa para transformar margem em crescimento previsível.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userPlan === "basic" && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Sua estrutura já indica capacidade de operar em nível avançado.
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Multi-loja, DRE completo e capacidade ilimitada. A evolução natural para quem já entende o valor da precificação inteligente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Cards — PRO in center */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {orderedPlans.map((plan) => {
            const slug = getPlanSlug(plan);
            const isCurrent = isCurrentPlan(plan);
            const isLower = isLowerPlan(plan);
            const isPro = slug === "pro";
            const meta = PLAN_META[slug] || PLAN_META.free;
            const hasAnchoring = plan.anchored_price_monthly > plan.real_price_monthly;
            const discountPct = hasAnchoring
              ? Math.round(((plan.anchored_price_monthly - plan.real_price_monthly) / plan.anchored_price_monthly) * 100)
              : 0;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-visible transition-shadow ${
                  isPro
                    ? "border-2 border-primary shadow-lg md:scale-[1.03] md:-my-2 z-10"
                    : isCurrent
                    ? "border-2 border-muted-foreground/30 bg-muted/20"
                    : "border"
                }`}
                onMouseEnter={() => {
                  if (isPro) trackGAAndFunnel("plan_hover_pro");
                }}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="gap-1 shadow-sm bg-primary text-primary-foreground text-[10px] px-3 py-1 whitespace-nowrap">
                      Mais escolhido por restaurantes que querem crescer com margem real
                    </Badge>
                  </div>
                )}

                {slug === "basic" && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="secondary" className="text-[10px] px-3 py-1 whitespace-nowrap">
                      Ideal para restaurantes em estruturação
                    </Badge>
                  </div>
                )}

                {hasAnchoring && discountPct > 0 && !isCurrent && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                      -{discountPct}%
                    </span>
                  </div>
                )}

                <CardContent className={`p-6 flex flex-col h-full ${isPro ? "pt-8" : "pt-6"}`}>
                  <div className="text-center mb-5">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <meta.icon className={`h-4 w-4 ${isPro ? "text-primary" : "text-muted-foreground"}`} />
                      <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.tagline}</p>

                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      {hasAnchoring && !isCurrent && (
                        <span className="text-sm line-through text-muted-foreground mr-1">
                          {formatPrice(plan.anchored_price_monthly)}
                        </span>
                      )}
                      <span className={`font-bold text-foreground ${isPro ? "text-4xl" : "text-3xl"}`}>
                        {formatPrice(plan.real_price_monthly)}
                      </span>
                      {plan.real_price_monthly > 0 && (
                        <span className="text-sm text-muted-foreground">/mês</span>
                      )}
                    </div>
                    {plan.real_price_monthly <= 0 && (
                      <span className="text-xs text-muted-foreground">por 7 dias</span>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-5 flex-1">
                    {plan.features.filter(f => f.included).map((f) => (
                      <li key={f.text} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 shrink-0 mt-0.5 ${isPro ? "text-primary" : "text-primary/70"}`} />
                        <span className="text-foreground">{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="secondary" disabled className="w-full">
                      Plano atual
                    </Button>
                  ) : isLower ? (
                    <Button variant="ghost" disabled className="w-full text-muted-foreground">
                      Plano inferior
                    </Button>
                  ) : isPro ? (
                    <Button
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      onClick={() => handleCtaClick("pro")}
                    >
                      Desbloquear Estrutura Completa <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleCtaClick(slug)}
                    >
                      Começar com Estrutura Essencial <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Maturity reinforcement */}
        {userPlan !== "pro" && (
          <div className="text-center space-y-3 py-2">
            <Button
              size="lg"
              className="gap-2 font-semibold"
              onClick={() => handleCtaClick("pro")}
            >
              Desbloquear Estrutura Completa <ArrowRight className="h-4 w-4" />
            </Button>
            {userPlan === "free" && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => handleCtaClick("basic")}
                >
                  Começar com Estrutura Essencial
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sem fidelidade. Evolua conforme sua operação cresce.
            </p>
          </div>
        )}

        {/* Full Comparison Table */}
        <Card>
          <CardContent className="p-6">
            <h3
              className="text-lg font-bold text-foreground text-center mb-6 cursor-pointer"
              onClick={handleCompareClick}
            >
              Comparação detalhada dos planos
            </h3>
            <PlanComparisonTable currentPlan={userPlan} />
          </CardContent>
        </Card>

        <PlanUpgradePrompt
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          currentPlan={userPlan}
          feature="upgrade"
        />
      </div>
    </TooltipProvider>
  );
}
