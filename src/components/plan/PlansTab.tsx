import { useState } from "react";
import { Check, Sparkles, ArrowRight, Lock, TrendingUp, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePublicPricing, type PricingPlan } from "@/hooks/useStrategicPricing";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanComparisonTable } from "@/components/landing/PlanComparisonTable";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";

const PLAN_SLUG_MAP: Record<string, string> = {
  teste: "free",
  essencial: "basic",
  pro: "pro",
};

const PLAN_HIGHLIGHTS: Record<string, { icon: typeof Zap; tagline: string; blocked: string[] }> = {
  free: {
    icon: Shield,
    tagline: "Demonstração estratégica com capacidade limitada",
    blocked: [
      "Estratégia completa de precificação",
      "Sub-receitas ilimitadas",
      "Otimização e projeção de escala",
      "Simulação de cenários",
      "Roadmap de crescimento",
    ],
  },
  basic: {
    icon: Zap,
    tagline: "Para quem quer lucrar com estrutura",
    blocked: [
      "Multi-loja (até 3 unidades)",
      "Dashboard avançado + DRE",
      "Suporte prioritário via WhatsApp",
      "Análises ilimitadas de cardápio",
    ],
  },
  pro: {
    icon: TrendingUp,
    tagline: "Controle total. Escala real. Potencial máximo.",
    blocked: [],
  },
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
      { text: "1 análise de cardápio (única)", included: true },
      { text: "1 combo estratégico (único)", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 0,
  },
  {
    id: "essencial", name: "Essencial", description: "Para quem quer lucrar certo",
    real_price_monthly: 97, anchored_price_monthly: 147,
    real_price_yearly: 932, anchored_price_yearly: 1411, yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Teste, mais:", included: true },
      { text: "Até 8 fichas técnicas", included: true },
      { text: "Até 100 insumos", included: true },
      { text: "Dashboard completo", included: true },
      { text: "5 análises de cardápio/mês", included: true },
      { text: "3 combos estratégicos/mês", included: true },
      { text: "Sub-receitas", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 1,
  },
  {
    id: "pro", name: "Pro", description: "Controle total do negócio",
    real_price_monthly: 147, anchored_price_monthly: 297,
    real_price_yearly: 1411, anchored_price_yearly: 2851, yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Essencial, mais:", included: true },
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Insumos ilimitados", included: true },
      { text: "Dashboard avançado + DRE", included: true },
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

export function PlansTab() {
  const { plans: dbPlans } = usePublicPricing();
  const { userPlan } = usePlanFeatures();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const plans = dbPlans.length > 0 ? dbPlans : fallbackPlans;

  const getPlanSlug = (plan: PricingPlan) =>
    PLAN_SLUG_MAP[plan.id?.toLowerCase()] || PLAN_SLUG_MAP[plan.name?.toLowerCase()] || plan.id;

  const isCurrentPlan = (plan: PricingPlan) => getPlanSlug(plan) === userPlan;

  const isLowerPlan = (plan: PricingPlan) => {
    const order: Record<string, number> = { free: 0, basic: 1, pro: 2 };
    const slug = getPlanSlug(plan);
    return (order[slug] ?? 0) < (order[userPlan] ?? 0);
  };

  return (
    <div className="space-y-8">
      {/* Strategic messaging for non-Pro users */}
      {userPlan !== "pro" && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground">
                  {userPlan === "free"
                    ? "O Teste revela a oportunidade. O Pro constrói a máquina."
                    : "Sua estrutura já indica capacidade de operar em nível avançado."}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userPlan === "free"
                    ? "Você está vendo apenas a camada inicial do seu potencial. Existem alavancas de crescimento, estratégias de multiplicação e camadas avançadas que ainda não foram desbloqueadas."
                    : "Você já domina a estrutura básica. O próximo nível lógico desbloqueia multi-loja, DRE avançado e capacidade ilimitada para escalar seus resultados."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isLower = isLowerPlan(plan);
          const slug = getPlanSlug(plan);
          const hasAnchoring = plan.anchored_price_monthly > plan.real_price_monthly;
          const discountPct = hasAnchoring
            ? Math.round(((plan.anchored_price_monthly - plan.real_price_monthly) / plan.anchored_price_monthly) * 100)
            : 0;
          const highlight = PLAN_HIGHLIGHTS[slug] || PLAN_HIGHLIGHTS.free;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-visible ${
                plan.is_popular
                  ? "border-2 border-primary shadow-lg"
                  : isCurrent
                  ? "border-2 border-muted-foreground/30 bg-muted/20"
                  : "border"
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="gap-1 shadow-sm bg-primary text-primary-foreground">
                    <Sparkles className="w-3 h-3" />
                    Mais Vantajoso
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

              <CardContent className="p-6 flex flex-col h-full">
                <div className="text-center mb-5">
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{highlight.tagline}</p>
                  <div className="flex items-baseline justify-center gap-1 mt-4">
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
                  {plan.real_price_monthly <= 0 && (
                    <span className="text-xs text-muted-foreground">por 7 dias</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-4 flex-1">
                  {plan.features.filter(f => f.included).map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* Blocked features for current plan */}
                {isCurrent && highlight.blocked.length > 0 && (
                  <div className="mb-4 pt-3 border-t border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      🔒 Potencial bloqueado
                    </p>
                    <ul className="space-y-1.5">
                      {highlight.blocked.slice(0, 3).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3 shrink-0 mt-0.5 opacity-50" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {highlight.blocked.length > 3 && (
                        <li className="text-xs text-primary font-medium pl-5">
                          +{highlight.blocked.length - 3} recursos avançados
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Plano atual
                  </Button>
                ) : isLower ? (
                  <Button variant="ghost" disabled className="w-full text-muted-foreground">
                    Plano inferior
                  </Button>
                ) : (
                  <Button
                    className={`w-full gap-2 ${plan.is_popular ? "bg-primary hover:bg-primary/90" : ""}`}
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => setShowUpgrade(true)}
                  >
                    Desbloquear potencial <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progression CTA */}
      {userPlan !== "pro" && (
        <Card className="border-dashed border-muted-foreground/20">
          <CardContent className="p-5 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {userPlan === "free"
                ? "🔍 O Teste mostra a oportunidade. O upgrade constrói o resultado."
                : "🚀 Você já opera com estrutura. O Pro desbloqueia escala."}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {userPlan === "free"
                ? "Este plano revela apenas o cenário base. Estratégias de multiplicação, alavancas ocultas e expansão de canais estão disponíveis nos planos superiores."
                : "Multi-loja, DRE completo, insumos ilimitados e suporte dedicado. A evolução natural para quem já entende o valor da precificação inteligente."}
            </p>
            <Button className="gap-2 mt-1" onClick={() => setShowUpgrade(true)}>
              Evoluir agora <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Full Comparison Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground text-center mb-6">Comparação detalhada dos planos</h3>
          <PlanComparisonTable />
        </CardContent>
      </Card>

      <PlanUpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={userPlan}
        feature="upgrade"
      />
    </div>
  );
}
