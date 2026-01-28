import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Trial",
    price: "Grátis",
    period: "7 dias",
    description: "Veja se funciona pra você",
    features: [
      { text: "Até 35 insumos", included: true },
      { text: "Até 3 fichas técnicas", included: true },
      { text: "Dashboard básico", included: true },
      { text: "Suporte por email", included: true },
      { text: "Exportação de relatórios", included: false },
      { text: "IA para produtos", included: false },
    ],
    cta: "Começar agora — é grátis",
    popular: false,
  },
  {
    name: "Básico",
    price: "R$ 49",
    period: "/mês",
    description: "Para quem quer lucrar certo",
    features: [
      { text: "Até 100 insumos", included: true },
      { text: "Até 15 fichas técnicas", included: true },
      { text: "Dashboard completo", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Exportação PDF/CSV", included: true },
      { text: "IA para produtos", included: false },
    ],
    cta: "Quero precificar certo",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mês",
    description: "Controle total do negócio",
    features: [
      { text: "Insumos ilimitados", included: true },
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Dashboard avançado", included: true },
      { text: "Suporte VIP", included: true },
      { text: "Relatórios completos", included: true },
      { text: "IA para nomes e descrições", included: true },
    ],
    cta: "Ter controle total agora",
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 bg-muted/30" id="precos">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            Planos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Escolha o plano ideal para{" "}
            <span className="text-gradient">seu negócio</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece grátis por 7 dias. Sem cartão de crédito necessário.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl bg-card border-2 ${
                plan.popular
                  ? "border-primary shadow-lg scale-[1.02]"
                  : "border-border"
              } transition-all duration-300 hover:shadow-card-hover`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-display font-bold text-xl mb-2 text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
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
                    <span
                      className={`text-sm ${
                        feature.included ? "text-foreground" : "text-muted-foreground"
                      }`}
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
        <div className="text-center mt-12 space-y-3">
          <p className="text-muted-foreground">
            Prefere falar com alguém?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="https://wa.me/5547996887776?text=Oi!%20Quero%20tirar%20uma%20dúvida%20sobre%20o%20Precify" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors font-medium text-sm"
            >
              💬 Chamar no WhatsApp
            </a>
            <a 
              href="mailto:precify.br@gmail.com" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
            >
              ✉️ Falar por email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
