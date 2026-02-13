import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function FinalCTASection() {
  return (
    <section className="py-16 lg:py-24 bg-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Você já vende. Agora comece a lucrar certo.
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
            Cada dia vendendo com preço errado é margem perdida. Comece agora e
            veja a diferença no próximo fechamento.
          </p>
          <Link to="/register">
            <Button
              size="xl"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-lg px-10"
            >
              Começar a Precificar Certo
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-primary-foreground/60 text-sm mt-4">
            Grátis por 7 dias · Sem cartão · Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
