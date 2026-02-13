import { ArrowRight, Package, Calculator, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Package,
    number: "1",
    title: "Cadastre seus insumos",
    description: "Informe o que você compra, quanto paga e quanto usa em cada receita.",
  },
  {
    icon: Calculator,
    number: "2",
    title: "O sistema calcula o custo real",
    description: "Incluindo perdas, embalagem e tudo que normalmente é esquecido.",
  },
  {
    icon: TrendingUp,
    number: "3",
    title: "Veja sua margem real",
    description: "Descubra quanto realmente sobra em cada produto vendido.",
  },
  {
    icon: DollarSign,
    number: "4",
    title: "Receba o preço ideal",
    description: "Para balcão e para iFood, cada um com a margem que você escolheu.",
  },
];

export function SolutionSection() {
  return (
    <section id="como-funciona" className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-sm font-medium text-success uppercase tracking-wide mb-2">
            Simples e direto
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja seu lucro real em poucos cliques.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sem planilha, sem fórmula complicada. Você insere os dados e o sistema faz o resto.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center group">
              {/* Connector arrow (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-10 text-primary/30 z-10">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}

              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center shadow-lg group-hover:border-primary/40 transition-all">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/register">
            <Button size="lg" className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group">
              Começar agora — é grátis
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
