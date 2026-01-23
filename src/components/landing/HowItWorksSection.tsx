import { Package, Settings, BadgeDollarSign, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "Cadastre seus custos",
    description: "Insumos e custo real para produzir cada item",
  },
  {
    number: "02",
    icon: Settings,
    title: "Defina as regras do negócio",
    description: "CMV, despesas e margens",
  },
  {
    number: "03",
    icon: BadgeDollarSign,
    title: "Veja dois preços prontos",
    description: "Venda direta e iFood, cada um com sua margem correta",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Simples e direto
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Como funciona a precificação
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector lines (desktop only) */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Mobile connector */}
              {index < steps.length - 1 && (
                <div className="md:hidden absolute left-8 top-20 w-0.5 h-12 bg-gradient-to-b from-primary/40 to-transparent" />
              )}

              <div className="flex flex-col items-center text-center group">
                {/* Icon container */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center shadow-lg group-hover:border-primary/40 group-hover:shadow-primary/10 transition-all duration-300">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {step.description}
                </p>

                {/* Arrow for desktop (between steps) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-6 top-8 text-primary/30">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Supporting text */}
        <div className="text-center mt-12 lg:mt-16">
          <p className="text-lg text-muted-foreground font-medium">
            Você escolhe onde vender.{" "}
            <span className="text-foreground">O sistema calcula o valor certo.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
