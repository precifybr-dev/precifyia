import { AlertTriangle, X, ArrowRight, DollarSign, FileX, Calculator, FolderX, Receipt, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const painPoints = [
  { icon: Calculator, text: "Fórmula quebrou — prejuízo silencioso" },
  { icon: FileX, text: "8 abas abertas, zero clareza" },
  { icon: DollarSign, text: "Preço errado descoberto só no vermelho" },
  { icon: FolderX, text: "Arquivo sumiu ou foi sobrescrito" },
  { icon: Receipt, text: "Comissão do iFood calculada errada" },
  { icon: TrendingDown, text: "Lucro evaporando sem explicação" },
];

export function PainSection() {
  const { trackEvent } = useFunnelTracking();
  return (
    <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
      {/* Subtle dramatic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-destructive/[0.02] via-transparent to-destructive/[0.02]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-8 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 font-display leading-tight">
            Sua planilha está te{" "}
            <span className="text-destructive relative">
              custando dinheiro
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47 2 153 2 199 5.5" stroke="hsl(var(--destructive))" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            E você provavelmente nem percebeu ainda.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto mb-12">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 p-5 rounded-xl bg-card border-2 border-destructive/20 hover:border-destructive/40 hover:shadow-md hover:shadow-destructive/5 transition-all duration-300 group opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/25 transition-colors">
                    <Icon className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-base font-bold text-foreground leading-snug">
                    {point.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-8 rounded-2xl bg-card border-2 border-warning/30 shadow-lg shadow-warning/5 max-w-xl mx-auto mb-10 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
              Atenção
            </div>
            <p className="text-foreground font-bold text-xl mb-1 font-display">
              O problema não é vender pouco.
            </p>
            <p className="text-muted-foreground text-lg">
              É <span className="text-destructive font-semibold">precificar errado</span> e perder dinheiro sem saber.
            </p>
          </div>

          <Link to="/register" onClick={() => trackEvent("cta_click", "pain_cta")}>
            <Button
              size="lg"
              data-cta-id="pain_cta"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-base"
            >
              Quero proteger meu lucro
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
