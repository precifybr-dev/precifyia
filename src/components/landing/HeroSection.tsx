import { ArrowRight, TrendingUp, DollarSign, PieChart, Calculator, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              Você pode estar vendendo no prejuízo
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-6">
              Saiba exatamente quanto{" "}
              <span className="text-gradient">lucra em cada venda.</span>
            </h1>

            {/* Audience qualifier */}
            <p className="text-sm sm:text-base text-muted-foreground/80 mb-4">
              Para restaurantes, lanchonetes, marmitarias e quem vende no balcão ou delivery
            </p>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Calcule o preço certo dos seus produtos considerando custos, taxas do iFood, cupons e despesas do negócio. Pare de adivinhar e comece a lucrar de verdade.
            </p>

            {/* Benefits */}
            <div className="flex flex-col gap-3 mb-8 max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <span className="text-base">Descubra quanto realmente sobra no seu bolso</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <span className="text-base">Veja o impacto real das taxas e cupons do iFood</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <span className="text-base">Precifique com segurança e durma tranquilo</span>
              </div>
              <div className="flex items-start gap-3 text-foreground">
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <span className="text-base">Tenha um preço para venda direta e outro para iFood — sem refazer cálculos</span>
                  <p className="text-sm text-muted-foreground mt-0.5">O custo é o mesmo. O sistema ajusta o preço conforme o canal.</p>
                </div>
              </div>
            </div>

            {/* Impact statement */}
            <div className="flex items-center gap-2 mb-8 p-3 rounded-lg bg-warning/10 border border-warning/20 max-w-xl mx-auto lg:mx-0">
              <span className="text-warning text-lg">⚠️</span>
              <p className="text-sm text-foreground">
                <span className="font-semibold">Dado real:</span> A maioria dos negócios descobre que estava perdendo dinheiro em pelo menos 3 produtos.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-4 justify-center lg:justify-start">
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 w-full sm:w-auto group text-base px-8">
                    Descubra se você lucra no iFood
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <a 
                href="#como-funciona" 
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group justify-center lg:justify-start"
              >
                Veja como calcular dois preços automaticamente
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 pt-8 border-t border-border justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Grátis por 7 dias</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Sem cartão</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative animate-fade-in lg:pl-8">
            <div className="relative">
              {/* Main dashboard card */}
              <div className="bg-card rounded-2xl shadow-xl border border-border p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visão Geral</p>
                    <h3 className="text-lg font-semibold text-foreground">Dashboard de Precificação</h3>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    +12%
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">R$ 15.420</p>
                    <p className="text-xs text-muted-foreground">Faturamento mensal</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-success" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">32%</p>
                    <p className="text-xs text-muted-foreground">Margem líquida</p>
                  </div>
                </div>

                {/* Products list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center text-lg">
                        🍔
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">X-Bacon Especial</p>
                        <p className="text-xs text-muted-foreground">CMV: 28%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">R$ 32,90</p>
                      <p className="text-xs text-muted-foreground">Preço sugerido</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                        🍕
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Pizza Margherita</p>
                        <p className="text-xs text-muted-foreground">CMV: 25%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">R$ 54,90</p>
                      <p className="text-xs text-muted-foreground">Preço sugerido</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -left-4 lg:-left-8 top-1/4 bg-card rounded-xl shadow-lg border border-border p-4 animate-float hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                    <p className="text-lg font-bold text-success">R$ 4.934</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 lg:-right-8 bottom-1/4 bg-card rounded-xl shadow-lg border border-border p-4 animate-float hidden sm:block" style={{ animationDelay: "2s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fichas técnicas</p>
                    <p className="text-lg font-bold text-foreground">24 produtos</p>
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
