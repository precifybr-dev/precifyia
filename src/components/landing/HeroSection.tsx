import { ArrowRight, Calculator, TrendingUp, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4 pt-32 pb-20 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
              <Utensils className="w-4 h-4" />
              <span>Plataforma #1 para Food Service</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Precifique com{" "}
              <span className="text-gradient">precisão</span>,{" "}
              lucre com <span className="text-gradient">inteligência</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Substitua suas planilhas por uma plataforma completa de precificação. 
              Calcule custos, CMV, margens e preços sugeridos em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Começar Grátis
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Já tenho conta
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-primary border-2 border-background"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  +500 negócios
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-warning"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-sm text-muted-foreground ml-1">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative lg:pl-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              {/* Main Card */}
              <div className="bg-card rounded-2xl shadow-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-semibold text-lg">Dashboard</h3>
                  <span className="text-xs text-muted-foreground">Tempo real</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-gradient-card border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">Margem Média</span>
                    </div>
                    <span className="font-display text-2xl font-bold text-success">32.5%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-card border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">CMV Praticado</span>
                    </div>
                    <span className="font-display text-2xl font-bold text-foreground">28.3%</span>
                  </div>
                </div>

                {/* Sample Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Produto</th>
                        <th className="text-right px-4 py-2 font-medium">Custo</th>
                        <th className="text-right px-4 py-2 font-medium">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="px-4 py-3">X-Burguer</td>
                        <td className="text-right px-4 py-3">R$ 8,50</td>
                        <td className="text-right px-4 py-3 text-success font-semibold">R$ 25,00</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-4 py-3">X-Salada</td>
                        <td className="text-right px-4 py-3">R$ 9,20</td>
                        <td className="text-right px-4 py-3 text-success font-semibold">R$ 28,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 p-4 rounded-xl bg-card shadow-lg border border-border animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-success flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success-foreground" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Lucro Líquido</span>
                    <span className="font-display font-bold text-success">+R$ 12.450</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 p-4 rounded-xl bg-card shadow-lg border border-border animate-float" style={{ animationDelay: "2s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Fichas Técnicas</span>
                    <span className="font-display font-bold">15 produtos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
