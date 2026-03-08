import {
  UtensilsCrossed, Receipt, BarChart3, RefreshCw, FileBarChart, Store,
  ShieldCheck, ArrowRight, Sparkles, TrendingUp, Package, Percent,
  ClipboardList, PieChart, Megaphone, Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const highlightFeature = {
  icon: UtensilsCrossed,
  badge: "Destaque",
  title: "Raio-X Financeiro do iFood",
  description:
    "Importe sua planilha do iFood e descubra quanto realmente sobra. Veja cupons, entregas, anúncios, taxa real vs. custo extra — tudo visual e sem fórmula manual.",
  bullets: [
    { icon: PieChart, text: "Custo Extra Real além da taxa base (12% ou 23%)" },
    { icon: Megaphone, text: "CPA de anúncios: custo por pedido classificado" },
    { icon: Truck, text: "Custo de entrega iFood separado e claro" },
    { icon: TrendingUp, text: "Gráficos de evolução mensal automáticos" },
  ],
};

const features = [
  {
    icon: Receipt,
    title: "Taxas reais do iFood",
    description: "Comissão, pagamento e antecipação calculados com os dados reais da planilha.",
  },
  {
    icon: BarChart3,
    title: "Margem de Contribuição real",
    description: "Margem por produto descontando impostos, taxas e custos variáveis.",
  },
  {
    icon: RefreshCw,
    title: "Recálculo automático",
    description: "Mudou o preço de um insumo? Todo o cardápio é atualizado em segundos.",
  },
  {
    icon: FileBarChart,
    title: "DRE simplificado",
    description: "Veja se seu negócio está saudável, apertado ou em risco — visualmente.",
  },
  {
    icon: ClipboardList,
    title: "CMV Global",
    description: "Acompanhe o Custo de Mercadoria Vendida por período e categoria.",
  },
  {
    icon: Sparkles,
    title: "Combos inteligentes com IA",
    description: "Gere combos otimizados para margem ou volume usando inteligência artificial.",
  },
  {
    icon: Store,
    title: "Multi-loja",
    description: "Gerencie cada unidade separadamente sem misturar dados.",
  },
  {
    icon: Package,
    title: "Embalagens no custo",
    description: "Inclua embalagens na precificação e saiba o custo real de cada produto entregue.",
  },
  {
    icon: Percent,
    title: "Simulador de promoções",
    description: "Simule descontos e veja o impacto na margem antes de publicar.",
  },
  {
    icon: ShieldCheck,
    title: "Backup e segurança",
    description: "Seus dados ficam protegidos com backup automático e acesso seguro.",
  },
];

export function FeaturesShowcase() {
  const { trackEvent } = useFunnelTracking();

  return (
    <section id="funcionalidades" className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Funcionalidades
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa para{" "}
            <span className="text-gradient">precificar com lucro</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Do insumo ao prato entregue no iFood — cada centavo é rastreado.
          </p>
        </div>

        {/* Highlight: iFood Analysis */}
        <div className="max-w-4xl mx-auto mb-14">
          <div className="relative rounded-2xl border-2 border-primary/20 bg-card p-6 sm:p-8 overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <highlightFeature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success mb-1">
                    ★ {highlightFeature.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {highlightFeature.title}
                  </h3>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                {highlightFeature.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {highlightFeature.bullets.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border px-4 py-3"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <b.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5 text-foreground">
                {f.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/register" onClick={() => trackEvent("cta_click", "features_cta")}>
            <Button
              size="lg"
              variant="hero"
              data-cta-id="features_cta"
              className="group"
            >
              Testar grátis por 7 dias
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
