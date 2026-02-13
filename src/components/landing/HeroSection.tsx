import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Você pode estar vendendo no prejuízo agora
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-6">
            Aumente sua margem em até{" "}
            <span className="text-gradient">27% no iFood</span>{" "}
            sem vender mais nada
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Descubra onde você está perdendo dinheiro e ajuste seus preços em minutos, mesmo sem entender de planilha.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 mb-10">
            <Link to="/register">
              <Button size="xl" className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-lg px-10">
                Calcular Meu Lucro Agora
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Grátis por 7 dias · Sem cartão · Cancele quando quiser
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>+1.200 restaurantes usam</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Resultado em 3 minutos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Feito para food service</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
