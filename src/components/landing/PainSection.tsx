import { AlertTriangle, X } from "lucide-react";

const painPoints = [
  "Não sabe o custo real de cada prato",
  "Ignora a taxa do iFood na hora de precificar",
  "Esquece embalagem, cartão e desperdício no cálculo",
  "Não tem ficha técnica atualizada",
  "Usa o mesmo preço no balcão e no delivery",
];

export function PainSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Header */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 mb-6">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Você pode estar vendendo muito…{" "}
            <span className="text-destructive">e lucrando pouco.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            A maioria dos restaurantes não sabe o lucro real porque ignora custos invisíveis. 
            Quanto mais vende errado, mais trabalha e menos sobra no fim do mês.
          </p>

          {/* Pain points */}
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-10">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10"
              >
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </div>
                <span className="text-sm font-medium text-foreground">{point}</span>
              </div>
            ))}
          </div>

          {/* Impact */}
          <div className="p-6 rounded-2xl bg-warning/5 border border-warning/20 max-w-xl mx-auto">
            <p className="text-foreground font-semibold text-lg mb-1">
              ⚠️ Resultado?
            </p>
            <p className="text-muted-foreground">
              Você fatura R$ 30 mil por mês, mas não sabe se sobram R$ 3 mil ou R$ 300.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
