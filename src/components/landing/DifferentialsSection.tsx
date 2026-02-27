import { Receipt, BarChart3, RefreshCw, FileBarChart, Store, ShieldCheck, ArrowRight, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const differentials = [
  {
    icon: UtensilsCrossed,
    title: "Análise inteligente do cardápio",
    description: "IA analisa seu cardápio do iFood com score de performance, identifica produtos estrela e sugere melhorias.",
  },
  {
    icon: Receipt,
    title: "Considera taxa real do iFood",
    description: "Comissão, taxa de pagamento e antecipação — tudo calculado automaticamente.",
  },
  {
    icon: BarChart3,
    title: "Margem de Contribuição real",
    description: "Margem de contribuição por produto descontando impostos, taxas e custos variáveis — não só CMV.",
  },
  {
    icon: RefreshCw,
    title: "Recalcula tudo quando insumo muda",
    description: "Mudou o preço de um insumo? Todo o cardápio é atualizado em segundos.",
  },
  {
    icon: FileBarChart,
    title: "DRE simplificado com indicador de saúde",
    description: "Veja se seu negócio está saudável, apertado ou em risco — visualmente.",
  },
  {
    icon: Store,
    title: "Multi-loja para mais de uma operação",
    description: "Gerencie cada unidade separadamente sem misturar dados.",
  },
  {
    icon: ShieldCheck,
    title: "Backup e segurança dos dados",
    description: "Seus dados ficam protegidos com backup automático e acesso seguro.",
  },
];

export function DifferentialsSection() {
  const { trackEvent } = useFunnelTracking();
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Não é sobre ser mais barato.{" "}
            <span className="text-gradient">É sobre vender certo.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {differentials.map((d) => (
            <div
              key={d.title}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <d.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base mb-2 text-foreground">
                {d.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {d.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/register" onClick={() => trackEvent("cta_click", "differentials_cta")}>
            <Button
              size="lg"
              data-cta-id="differentials_cta"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group"
            >
              Começar meu teste grátis
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
