import { 
  Calculator, 
  FileSpreadsheet, 
  TrendingUp, 
  Package, 
  PieChart, 
  Smartphone,
  Zap,
  Shield,
  RefreshCw
} from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Ficha Técnica Inteligente",
    description: "Monte receitas puxando insumos por código. Cálculo automático de custos por item e receita completa."
  },
  {
    icon: Calculator,
    title: "CMV em Tempo Real",
    description: "Compare seu CMV praticado vs desejado. Alertas automáticos quando estiver fora da meta."
  },
  {
    icon: TrendingUp,
    title: "Preço Sugerido",
    description: "Preços calculados para cardápio e delivery considerando taxas e margem desejada."
  },
  {
    icon: Package,
    title: "Gestão de Insumos",
    description: "Cadastre insumos com fator de correção automático. Atualização em massa reflete em todas as fichas."
  },
  {
    icon: PieChart,
    title: "Dashboard Completo",
    description: "Ponto de equilíbrio, margens, comparativo de canais de venda e muito mais em um só lugar."
  },
  {
    icon: Smartphone,
    title: "100% Online",
    description: "Acesse de qualquer dispositivo. Seus dados sempre atualizados e seguros na nuvem."
  }
];

const highlights = [
  {
    icon: Zap,
    title: "Cálculos Instantâneos",
    description: "Alterou um insumo? Todas as fichas técnicas são atualizadas em tempo real."
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description: "Criptografia de ponta a ponta e backups automáticos diários."
  },
  {
    icon: RefreshCw,
    title: "Sincronização Total",
    description: "Despesas, custos e receitas sempre conectados para margem real."
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            Funcionalidades
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Tudo que você precisa para{" "}
            <span className="text-gradient">precificar com precisão</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Substitua planilhas complexas por uma plataforma intuitiva que calcula 
            tudo automaticamente para você.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-card">
          <div className="grid md:grid-cols-3 gap-8">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <highlight.icon className="w-6 h-6 text-success" />
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
