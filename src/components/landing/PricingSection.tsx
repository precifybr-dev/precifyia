import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Trial",
    price: "Grátis",
    period: "7 dias",
    description: "Teste todas as funcionalidades",
    features: [
      { text: "Até 35 insumos", included: true },
      { text: "Até 3 fichas técnicas", included: true },
      { text: "Dashboard básico", included: true },
      { text: "Suporte por email", included: true },
      { text: "Exportação de relatórios", included: false },
      { text: "IA para produtos", included: false },
    ],
    cta: "Começar Trial",
    popular: false,
  },
  {
    name: "Básico",
    price: "R$ 49",
    period: "/mês",
    description: "Para pequenos negócios",
    features: [
      { text: "Até 100 insumos", included: true },
      { text: "Até 15 fichas técnicas", included: true },
      { text: "Dashboard completo", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Exportação PDF/CSV", included: true },
      { text: "IA para produtos", included: false },
    ],
    cta: "Assinar Básico",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mês",
    description: "Recursos ilimitados + IA",
    features: [
      { text: "Insumos ilimitados", included: true },
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Dashboard avançado", included: true },
      { text: "Suporte VIP", included: true },
      { text: "Relatórios completos", included: true },
      { text: "IA para nomes e descrições", included: true },
    ],
    cta: "Assinar Pro",
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 bg-muted/30" id="pricing">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            Planos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Escolha o plano ideal para{" "}
            <span className="text-gradient">seu negócio</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece grátis por 7 dias. Sem cartão de crédito necessário.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl bg-card border ${
                plan.popular
                  ? "border-primary shadow-glow scale-105 z-10"
                  : "border-border"
              } transition-all duration-300 hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-display font-bold text-xl mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span
                      className={
                        feature.included ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="block">
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Note */}
        <p className="text-center text-muted-foreground mt-12">
          Dúvidas? Entre em contato pelo{" "}
          <a href="#" className="text-primary hover:underline">
            suporte@precify.com.br
          </a>
        </p>
      </div>
    </section>
  );
}
