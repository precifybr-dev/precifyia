import { TrendingUp, Clock, Search, RefreshCw, DollarSign } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Aumente sua margem",
    description:
      "Ajustando preços com base no custo real e na taxa de cada canal.",
  },
  {
    icon: Clock,
    title: "Economize até 6 horas por semana",
    description:
      "Comparado a planilhas manuais. O sistema calcula tudo automaticamente.",
  },
  {
    icon: Search,
    title: "Descubra prejuízos invisíveis em menos de 10 minutos",
    description:
      "Veja quais produtos estão dando prejuízo antes que seja tarde.",
  },
  {
    icon: RefreshCw,
    title: "Recalcule todo cardápio em segundos",
    description:
      "Quando um insumo muda de preço, tudo é atualizado automaticamente.",
  },
  {
    icon: DollarSign,
    title: "Saiba quanto sobra por pedido no iFood",
    description:
      "Lucro líquido real, descontando taxas, embalagem e impostos.",
  },
];

export function BenefitsSection() {
  return (
    <section id="resultados" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Resultados que impactam o caixa
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-success/30 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success group-hover:scale-110 transition-all duration-300">
                <benefit.icon className="w-6 h-6 text-success group-hover:text-success-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-foreground">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
