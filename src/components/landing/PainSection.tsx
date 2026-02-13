import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const painPoints = [
  "Fórmula que quebra e você não sabe onde mexer",
  "8 abas abertas e ninguém entende nada",
  "Preço calculado errado e você só descobre no fim do mês",
  "Arquivo perdido ou duplicado",
  "Comissão do iFood calculada errado",
  "Lucro que some e você não sabe por quê",
];

export function PainSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 mb-6">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Se você usa planilha, provavelmente{" "}
            <span className="text-destructive">já passou por isso:</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-10 mt-8">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10"
              >
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {point}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-warning/5 border border-warning/20 max-w-xl mx-auto mb-8">
            <p className="text-foreground font-semibold text-lg mb-1">
              O problema não é vender pouco.
            </p>
            <p className="text-muted-foreground">
              É precificar errado.
            </p>
          </div>

          <Link to="/register">
            <Button
              size="lg"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group"
            >
              Calcular meu lucro agora
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
