import { useState } from "react";
import { Check, X, Sparkles, ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import { usePublicPricing, type PricingPlan } from "@/hooks/useStrategicPricing";
import { PlanComparisonTable } from "./PlanComparisonTable";

function formatPrice(value: number) {
  if (value <= 0) return "Grátis";
  return `R$ ${Math.round(value)}`;
}

// Fallback plans if DB is empty
const fallbackPlans: PricingPlan[] = [
  {
    id: "teste", name: "Teste", description: "Para conhecer o sistema",
    real_price_monthly: 0, anchored_price_monthly: 0,
    real_price_yearly: 0, anchored_price_yearly: 0,
    yearly_discount_percent: 0,
    features: [
      { text: "Até 2 fichas técnicas", included: true },
      { text: "Até 35 insumos", included: true },
      { text: "Dashboard básico", included: true },
      { text: "1 análise de cardápio (única)", included: true },
      { text: "1 combo estratégico (único)", included: true },
      { text: "1 importação iFood (única)", included: true },
      { text: "1 importação de planilha (até 35 insumos)", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 0,
  },
  {
    id: "essencial", name: "Essencial", description: "Para quem quer lucrar certo",
    real_price_monthly: 97, anchored_price_monthly: 147,
    real_price_yearly: 932, anchored_price_yearly: 1411,
    yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Teste, mais:", included: true },
      { text: "Até 8 fichas técnicas", included: true },
      { text: "Até 100 insumos", included: true },
      { text: "Dashboard completo", included: true },
      { text: "5 análises de cardápio/mês", included: true },
      { text: "3 combos estratégicos/mês", included: true },
      { text: "5 importações iFood/mês", included: true },
      { text: "3 importações de planilha/mês", included: true },
      { text: "Sub-receitas", included: true },
      { text: "Suporte padrão", included: true },
    ],
    is_popular: false, is_active: true, sort_order: 1,
  },
  {
    id: "pro", name: "Pro", description: "Controle total do negócio",
    real_price_monthly: 147, anchored_price_monthly: 297,
    real_price_yearly: 1411, anchored_price_yearly: 2851,
    yearly_discount_percent: 20,
    features: [
      { text: "Tudo do plano Essencial, mais:", included: true },
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Insumos ilimitados", included: true },
      { text: "Dashboard avançado + DRE", included: true },
      { text: "10 análises de cardápio/mês", included: true },
      { text: "5 combos estratégicos/mês", included: true },
      { text: "Importação iFood ilimitada", included: true },
      { text: "Importação de planilha ilimitada", included: true },
      { text: "Até 3 lojas (limites por conta)", included: true },
      { text: "Colaboradores", included: true },
      { text: "Suporte via WhatsApp", included: true },
    ],
    is_popular: true, is_active: true, sort_order: 2,
  },
];

export function PricingSection() {
  const { trackEvent } = useFunnelTracking();
  const { plans: dbPlans, phrases } = usePublicPricing();
  const [showComparison, setShowComparison] = useState(false);

  const plans = dbPlans.length > 0 ? dbPlans : fallbackPlans;

  return (
    <section className="py-16 lg:py-24 bg-muted/30" id="precos">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            Quanto custa continuar{" "}
            <span className="text-gradient">errando sua margem?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Se você errar R$2 por prato e vender 1.000 no mês, isso já é{" "}
            <span className="font-semibold text-destructive">R$2.000 perdidos.</span>
          </p>
          <p className="text-muted-foreground mt-2">
            O Precify custa menos que 1 erro por dia.
          </p>
        </div>

        {/* Strategic phrases */}
        {phrases.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto mb-8">
            {phrases.map((phrase, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-sm border border-primary/10">
                <Sparkles className="w-3.5 h-3.5" />
                {phrase}
              </span>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          {plans.map((plan) => {
            const hasAnchoring = plan.anchored_price_monthly > plan.real_price_monthly;
            const discountPct = hasAnchoring
              ? Math.round(((plan.anchored_price_monthly - plan.real_price_monthly) / plan.anchored_price_monthly) * 100)
              : 0;
            const ctaId = `pricing_${plan.id}_cta`;

            return (
              <div
                key={plan.id}
                className={`relative p-8 rounded-2xl bg-card border-2 ${
                  plan.is_popular
                    ? "border-primary shadow-lg scale-[1.02]"
                    : "border-border"
                } transition-all duration-300 hover:shadow-card-hover`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg">
                      <Sparkles className="w-4 h-4" />
                      Mais Vantajoso
                    </span>
                  </div>
                )}

                {hasAnchoring && discountPct > 0 && (
                  <div className="absolute -top-3 -right-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-success text-success-foreground text-xs font-bold shadow">
                      -{discountPct}%
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="font-bold text-xl mb-2 text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    {hasAnchoring && (
                      <span className="text-lg line-through text-muted-foreground mr-2">
                        {formatPrice(plan.anchored_price_monthly)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(plan.real_price_monthly)}
                    </span>
                    {plan.real_price_monthly > 0 && (
                      <span className="text-muted-foreground">/mês</span>
                    )}
                  </div>
                  {plan.real_price_monthly <= 0 && (
                    <span className="text-muted-foreground text-sm">por 7 dias</span>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included ? (
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-success" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground"}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to="/register" className="block" onClick={() => trackEvent("cta_click", ctaId)}>
                  <Button
                    size="lg"
                    data-cta-id={ctaId}
                    className={`w-full group ${
                      plan.is_popular
                        ? "bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25"
                        : ""
                    }`}
                    variant={plan.is_popular ? "default" : "outline"}
                  >
                    {plan.real_price_monthly <= 0 ? "Testar por 7 dias" : "Começar agora"}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Compare plans toggle */}
        <div className="text-center mt-10">
          <Button
            variant="ghost"
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowDown className={`w-4 h-4 transition-transform ${showComparison ? "rotate-180" : ""}`} />
            {showComparison ? "Ocultar comparação" : "Comparar todos os planos"}
          </Button>
        </div>

        {showComparison && (
          <div className="max-w-4xl mx-auto mt-6 p-6 rounded-2xl bg-card border border-border shadow-sm animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-lg font-bold text-foreground text-center mb-6">Comparação detalhada</h3>
            <PlanComparisonTable />
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-3">Prefere falar com alguém?</p>
          <a
            href="https://wa.me/5547996887776"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success font-medium text-sm hover:opacity-80 transition-opacity"
          >
            💬 Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
