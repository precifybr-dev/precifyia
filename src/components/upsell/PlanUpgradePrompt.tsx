import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUpgradeTracking } from "@/hooks/useUpgradeTracking";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, ArrowDown, Check, X, Crown } from "lucide-react";
import { usePublicPricing, type PricingPlan } from "@/hooks/useStrategicPricing";
import { PlanComparisonTable } from "@/components/landing/PlanComparisonTable";

interface PlanUpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  feature: string;
  limitReached?: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Teste",
  basic: "Essencial",
  pro: "Pro",
};

const PLAN_SLUG_MAP: Record<string, string> = {
  teste: "free",
  essencial: "basic",
  pro: "pro",
};

const fallbackPlans: PricingPlan[] = [
  {
    id: "teste", name: "Teste", description: "Para conhecer o sistema",
    real_price_monthly: 0, anchored_price_monthly: 0,
    real_price_yearly: 0, anchored_price_yearly: 0, yearly_discount_percent: 0,
    features: [
      { text: "Até 2 fichas técnicas", included: true },
      { text: "Até 35 insumos", included: true },
      { text: "Dashboard básico", included: true },
      { text: "1 análise de cardápio", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 0,
  },
  {
    id: "essencial", name: "Essencial", description: "Para quem quer lucrar certo",
    real_price_monthly: 97, anchored_price_monthly: 147,
    real_price_yearly: 932, anchored_price_yearly: 1411, yearly_discount_percent: 20,
    features: [
      { text: "Até 8 fichas técnicas", included: true },
      { text: "Até 100 insumos", included: true },
      { text: "5 análises de cardápio/mês", included: true },
      { text: "Sub-receitas e exportação", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 1,
  },
  {
    id: "pro", name: "Pro", description: "Controle total do negócio",
    real_price_monthly: 147, anchored_price_monthly: 297,
    real_price_yearly: 1411, anchored_price_yearly: 2851, yearly_discount_percent: 20,
    features: [
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "10 análises de cardápio/mês", included: true },
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

export function PlanUpgradePrompt({
  open,
  onOpenChange,
  currentPlan,
  feature,
  limitReached,
}: PlanUpgradePromptProps) {
  const navigate = useNavigate();
  const { plans: dbPlans } = usePublicPricing();
  const [showComparison, setShowComparison] = useState(false);
  const { trackUpgradeViewed, trackUpgradeClicked, trackUpgradeDismissed } = useUpgradeTracking();

  // Track when prompt is shown
  useEffect(() => {
    if (open) {
      trackUpgradeViewed(feature);
    }
  }, [open, feature]);

  const plans = dbPlans.length > 0 ? dbPlans : fallbackPlans;

  const getPlanSlug = (plan: PricingPlan) =>
    PLAN_SLUG_MAP[plan.id?.toLowerCase()] || PLAN_SLUG_MAP[plan.name?.toLowerCase()] || plan.id;

  const isCurrentPlan = (plan: PricingPlan) => {
    const slug = getPlanSlug(plan);
    return slug === currentPlan;
  };

  const isLowerPlan = (plan: PricingPlan) => {
    const order: Record<string, number> = { free: 0, basic: 1, pro: 2 };
    const slug = getPlanSlug(plan);
    return (order[slug] ?? 0) < (order[currentPlan] ?? 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Escolha seu plano
          </DialogTitle>
          <DialogDescription>
            {limitReached
              ? `Você atingiu o limite de ${limitReached} no plano ${PLAN_LABELS[currentPlan] || currentPlan}. Escolha um plano para continuar crescendo.`
              : `A funcionalidade "${feature}" está disponível em planos superiores. Desbloqueie todo o potencial do Precify.`}
          </DialogDescription>
        </DialogHeader>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan);
            const isLower = isLowerPlan(plan);
            const hasAnchoring = plan.anchored_price_monthly > plan.real_price_monthly;
            const discountPct = hasAnchoring
              ? Math.round(((plan.anchored_price_monthly - plan.real_price_monthly) / plan.anchored_price_monthly) * 100)
              : 0;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-5 rounded-xl border-2 transition-all ${
                  plan.is_popular
                    ? "border-primary shadow-md bg-primary/5"
                    : isCurrent
                    ? "border-muted bg-muted/30"
                    : "border-border bg-card"
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1 shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                {hasAnchoring && discountPct > 0 && !isCurrent && (
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success text-success-foreground text-xs font-bold shadow">
                      -{discountPct}%
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1 mt-3">
                    {hasAnchoring && !isCurrent && (
                      <span className="text-sm line-through text-muted-foreground mr-1">
                        {formatPrice(plan.anchored_price_monthly)}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(plan.real_price_monthly)}
                    </span>
                    {plan.real_price_monthly > 0 && (
                      <span className="text-sm text-muted-foreground">/mês</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-4 flex-1">
                  {plan.features.filter(f => f.included).slice(0, 5).map((f) => (
                    <li key={f.text} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{f.text}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Seu plano atual
                  </Button>
                ) : isLower ? (
                  <Button variant="ghost" disabled className="w-full text-muted-foreground">
                    Plano inferior
                  </Button>
                ) : (
                  <Button
                    className={`w-full gap-2 ${plan.is_popular ? "bg-primary hover:bg-primary/90" : ""}`}
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => {
                      trackUpgradeClicked(feature, getPlanSlug(plan));
                      onOpenChange(false);
                      navigate("/app/plan");
                    }}
                  >
                    Escolher plano <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison toggle */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowDown className={`w-4 h-4 transition-transform ${showComparison ? "rotate-180" : ""}`} />
            {showComparison ? "Ocultar comparação" : "Comparar todos os benefícios"}
          </Button>
        </div>

        {showComparison && (
          <div className="rounded-xl border border-border p-4 bg-muted/20 animate-in slide-in-from-top-4 duration-300">
            <PlanComparisonTable />
          </div>
        )}

        <div className="text-center pt-2">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              trackUpgradeDismissed(feature);
              onOpenChange(false);
            }}
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
