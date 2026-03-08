import { Check, X, ArrowRight, FileSpreadsheet, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import devicesMockup from "@/assets/precify-devices-mockup.png";

const rows = [
  { label: "Precificação", planilha: "Manual", precify: "Automática", type: "text" as const },
  { label: "Economia de tempo", planilha: "Nenhuma", precify: "Até 6h/semana", type: "text" as const },
  { label: "Aumento de margem", planilha: "Nenhum", precify: "Até 15%", type: "text" as const },
  { label: "Erros de cálculo", planilha: "Frequente", precify: "Zero", type: "text" as const },
  { label: "Custo real do iFood", check: false, precifyCheck: true, type: "check" as const },
  { label: "DRE simplificado", check: false, precifyCheck: true, type: "check" as const },
  { label: "Análise de cardápio", check: false, precifyCheck: true, type: "check" as const },
  { label: "Combos com IA", check: false, precifyCheck: true, type: "check" as const },
];

export function ComparisonSection() {
  const { trackEvent } = useFunnelTracking();

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Gradient background inspired by the reference */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-success/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground mb-3">
            Transforme a gestão do seu restaurante com o Precify
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            Veja a diferença entre depender de planilhas e ter um sistema inteligente.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          {/* Comparison table */}
          <div className="w-full">
            <div className="rounded-2xl bg-white overflow-hidden shadow-2xl border border-white/50">
              {/* Header */}
              <div className="grid grid-cols-[1fr,120px,120px] sm:grid-cols-[1fr,140px,140px]">
                <div className="bg-white py-3 px-4 sm:px-6" />
                <div className="bg-red-50 py-3 text-center border-b border-red-100">
                  <div className="flex items-center justify-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-red-400" />
                    <span className="text-xs sm:text-sm font-bold text-red-600">Planilha</span>
                  </div>
                </div>
                <div className="bg-emerald-50 py-3 text-center border-b border-emerald-100">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">Precify</span>
                </div>
              </div>

              {/* Rows */}
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr,120px,120px] sm:grid-cols-[1fr,140px,140px] border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 py-3.5 px-4 sm:px-6">
                    {row.label}
                  </span>

                  {/* Planilha column */}
                  <div className="flex items-center justify-center py-3.5 bg-red-50/60 border-l border-gray-100">
                    {row.type === "check" ? (
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-500" strokeWidth={3} />
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">{row.planilha}</span>
                    )}
                  </div>

                  {/* Precify column */}
                  <div className="flex items-center justify-center py-3.5 bg-emerald-50/60">
                    {row.type === "check" ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold text-emerald-700">{row.precify}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA below table */}
            <div className="text-center mt-8">
              <Link to="/register" onClick={() => trackEvent("cta_click", "comparison_cta")}>
                <Button
                  size="lg"
                  data-cta-id="comparison_cta"
                  className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 group font-bold"
                >
                  Experimentar grátis
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Device mockup */}
          <div className="relative flex items-center justify-center">
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl scale-75 pointer-events-none" />

              <img
                src={devicesMockup}
                alt="Precify funcionando no computador e celular — dashboard de precificação de restaurantes"
                className="relative w-full max-w-lg mx-auto drop-shadow-2xl"
                loading="lazy"
              />

              {/* Floating badges */}
              <div className="absolute -top-2 left-4 sm:left-0 animate-float">
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-white/50">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Desktop</span>
                </div>
              </div>

              <div className="absolute -bottom-2 right-4 sm:right-0 animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-white/50">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Mobile</span>
                </div>
              </div>

              {/* "Teste Já" badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-16">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 bg-warning text-warning-foreground rounded-full px-5 py-2 text-sm font-bold shadow-lg hover:scale-105 transition-transform"
                  onClick={() => trackEvent("cta_click", "comparison_badge_cta")}
                >
                  ★ Teste Já
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
