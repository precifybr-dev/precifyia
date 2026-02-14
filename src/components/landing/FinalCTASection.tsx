import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

export function FinalCTASection() {
  const { trackEvent } = useFunnelTracking();
  return (
    <section className="py-16 lg:py-24 bg-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Você quer continuar confiando em planilha ou quer ter controle real do seu lucro?
          </h2>
          <Link to="/register" onClick={() => trackEvent("cta_click", "final_cta")}>
            <Button
              size="xl"
              data-cta-id="final_cta"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-lg px-10 mt-4"
            >
              Teste grátis por 7 dias
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-primary-foreground/60 text-sm mt-4">
            Leva menos de 1 minuto.
          </p>
        </div>
      </div>
    </section>
  );
}
