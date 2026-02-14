import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const rows = [
  { label: "Processo", planilha: "Manual", precify: "Automático" },
  { label: "Erro humano", planilha: "Fácil de errar", precify: "Margem protegida" },
  { label: "Fórmulas", planilha: "Quebram sem aviso", precify: "Calcula comissão, taxa e custo real" },
  { label: "Custos ocultos", planilha: "Não considera todos", precify: "Mostra lucro real por produto" },
  { label: "Descoberta do erro", planilha: "Depois de perder dinheiro", precify: "Antes de publicar o preço" },
];

export function ComparisonSection() {
  const { trackEvent } = useFunnelTracking();
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Planilha vs Precify
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Table header */}
          <div className="grid grid-cols-3 gap-4 mb-2 px-4">
            <div />
            <div className="text-center">
              <span className="text-sm font-semibold text-destructive uppercase tracking-wide">Planilha</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-success uppercase tracking-wide">Precify</span>
            </div>
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 gap-4 items-center p-4 rounded-xl bg-card border border-border"
              >
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                <div className="flex items-center justify-center gap-2">
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.planilha}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{row.precify}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-lg font-semibold text-foreground mb-1">
              Planilha mostra número.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Precify mostra <span className="text-success font-semibold">lucro real.</span>
            </p>
            <Link to="/register" onClick={() => trackEvent("cta_click", "comparison_cta")}>
              <Button
                size="lg"
                data-cta-id="comparison_cta"
                className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group"
              >
                Experimentar o Precify
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
