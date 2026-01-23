import { 
  Calculator, 
  FileSpreadsheet, 
  TrendingUp, 
  Package, 
  PieChart, 
  Smartphone,
  DollarSign,
  Target,
  ShoppingBag
} from "lucide-react";

const benefits = [
  {
    icon: FileSpreadsheet,
    title: "Saiba exatamente quanto custa cada prato",
    description: "Monte suas receitas e veja o custo real de cada item, incluindo perdas e preparo."
  },
  {
    icon: Calculator,
    title: "Nunca mais venda no prejuízo",
    description: "O sistema avisa quando seu preço não cobre os custos — antes de você perder dinheiro."
  },
  {
    icon: TrendingUp,
    title: "Defina o preço certo para lucrar de verdade",
    description: "Receba o preço ideal baseado no lucro que você quer ter, não em achismo."
  },
  {
    icon: Package,
    title: "Atualize um insumo, todas as fichas recalculam",
    description: "Subiu a farinha? Todos os produtos que usam são recalculados automaticamente."
  },
  {
    icon: PieChart,
    title: "Veja quanto sobra no final do mês",
    description: "Calcule sua margem líquida real, descontando todas as despesas e taxas."
  },
  {
    icon: Smartphone,
    title: "Acesse de qualquer lugar, a qualquer hora",
    description: "Consulte seus preços pelo celular, mesmo no meio de uma compra no atacado."
  }
];

const highlights = [
  {
    icon: DollarSign,
    title: "Entenda o impacto real do iFood",
    description: "Simule taxas, cupons e frete para saber quanto realmente sobra por pedido."
  },
  {
    icon: Target,
    title: "Separe balcão de delivery",
    description: "Preços diferentes para canais diferentes — cada um com sua margem garantida."
  },
  {
    icon: ShoppingBag,
    title: "Controle custos e despesas separados",
    description: "Saiba o que é custo de produção e o que é despesa do negócio, sem misturar."
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background" id="funcionalidades">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-success/10 text-success font-medium text-sm mb-4">
            O que você ganha
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Pare de trabalhar no escuro.{" "}
            <span className="text-gradient">Saiba se está lucrando.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Chega de achar que está ganhando e descobrir no fim do mês que não sobrou nada.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-success/30 hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success group-hover:scale-110 transition-all duration-300">
                <benefit.icon className="w-6 h-6 text-success group-hover:text-success-foreground transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{benefit.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Highlights - iFood specific */}
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-card">
          <div className="text-center mb-8">
            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Especialmente feito pra quem vende no <span className="text-destructive">iFood</span>
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <highlight.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-foreground mb-1">{highlight.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{highlight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
