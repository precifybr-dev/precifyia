import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Teste",
    price: "Grátis",
    period: "por 7 dias",
    description: "Para conhecer o sistema",
    features: [
      { text: "Até 3 fichas técnicas", included: true },
      { text: "Até 35 insumos", included: true },
      { text: "Dashboard básico", included: true },
      { text: "Importação de planilha", included: false },
      { text: "Multi-loja", included: false },
      { text: "Combos estratégicos", included: false },
    ],
    popular: false,
  },
  {
    name: "Básico",
    price: "R$ 49",
    period: "/mês",
    description: "Para quem quer lucrar certo",
    features: [
      { text: "Até 8 fichas técnicas", included: true },
      { text: "Até 100 insumos", included: true },
      { text: "Dashboard completo", included: true },
      { text: "Importação de planilha", included: true },
      { text: "Multi-loja", included: false },
      { text: "Combos estratégicos", included: false },
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mês",
    description: "Controle total do negócio",
    features: [
      { text: "Fichas técnicas ilimitadas", included: true },
      { text: "Insumos ilimitados", included: true },
      { text: "Dashboard avançado + DRE", included: true },
      { text: "Importação de planilha", included: true },
      { text: "Multi-loja + equipe", included: true },
      { text: "Combos estratégicos", included: true },
    ],
    popular: true,
  },
];

export function PricingSection() {
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

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
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
                    Mais Vantajoso
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
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
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
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="block">
                <Button
                  size="lg"
                  className={`w-full group ${
                    plan.popular
                      ? "bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.name === "Teste" ? "Testar por 7 dias" : "Calcular meu lucro agora"}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

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
