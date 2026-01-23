import { Play, DollarSign, TrendingUp, Percent } from "lucide-react";

export function DemoSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Demonstração
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja na prática
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Acompanhe como o sistema calcula automaticamente os dois preços a partir dos seus custos
          </p>
        </div>

        {/* Demo container */}
        <div className="max-w-4xl mx-auto">
          {/* Video/GIF placeholder */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border shadow-xl aspect-video">
            {/* Simulated demo content */}
            <div className="absolute inset-0 flex flex-col">
              {/* Header bar simulation */}
              <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground">
                    Ficha Técnica — Hambúrguer Artesanal
                  </div>
                </div>
              </div>

              {/* Main content simulation */}
              <div className="flex-1 p-6 flex items-center justify-center">
                <div className="grid md:grid-cols-3 gap-6 w-full max-w-2xl">
                  {/* Input simulation */}
                  <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                    <div className="text-xs text-muted-foreground mb-2">Custo Total</div>
                    <div className="text-2xl font-bold text-foreground">R$ 12,00</div>
                    <div className="text-xs text-muted-foreground mt-1">CMV: 30%</div>
                  </div>

                  {/* Output 1 */}
                  <div className="bg-card rounded-xl p-4 border-2 border-primary/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-bl">
                      Balcão
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Preço Venda</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">R$ 40,00</div>
                    <div className="flex items-center gap-1 mt-1 text-success text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Margem: 70%
                    </div>
                  </div>

                  {/* Output 2 */}
                  <div className="bg-card rounded-xl p-4 border-2 border-success/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-success/10 text-success text-[10px] font-medium px-2 py-0.5 rounded-bl">
                      iFood
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">Preço iFood</span>
                    </div>
                    <div className="text-2xl font-bold text-success">R$ 54,79</div>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                      <Percent className="w-3 h-3" />
                      Taxa: 27%
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Cálculo automático
              </div>
            </div>

            {/* Play button overlay (for when video is added) */}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Supporting text */}
          <div className="text-center mt-8">
            <p className="text-xl font-semibold text-foreground">
              O mesmo produto.{" "}
              <span className="text-primary">Dois preços corretos.</span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Cada canal tem suas taxas. O sistema faz a conta por você.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
