import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const bullets = [
  "Veja seu lucro real por produto",
  "Considere todas as taxas automaticamente",
  "Ajuste preços em minutos",
];

export function HeroSection() {
  return (
    <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-28 bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-6">
            Saiba exatamente quanto você lucra{" "}
            <span className="text-gradient">por pedido no iFood.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Descubra quanto realmente sobra por item, ajuste seus preços
            corretamente e pare de trabalhar no escuro.
          </p>

          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-left">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{b}</span>
                </div>
              ))}
            </div>

            <Link to="/register">
              <Button
                size="xl"
                className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-lg px-10"
              >
                Começar a Precificar Certo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground">
              Grátis por 7 dias · Sem cartão · Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
