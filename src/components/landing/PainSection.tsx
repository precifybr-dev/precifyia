import { AlertTriangle, X } from "lucide-react";

const painPoints = [
  "Ignora a taxa real do iFood na hora de precificar",
  "Não calcula o CMV corretamente",
  "Não considera perdas naturais dos insumos",
  "Não inclui custos fixos no preço",
  "Ajusta preço \"no chute\"",
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
            Você pode estar vendendo muito…{" "}
            <span className="text-destructive">e lucrando pouco.</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            A maioria dos restaurantes não sabe o lucro real porque comete esses
            erros na hora de precificar:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-10">
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

          <div className="p-6 rounded-2xl bg-warning/5 border border-warning/20 max-w-xl mx-auto">
            <p className="text-foreground font-semibold text-lg mb-1">
              ⚠️ O resultado?
            </p>
            <p className="text-muted-foreground">
              Quanto mais vende errado, mais trabalha e menos sobra no fim do
              mês.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
