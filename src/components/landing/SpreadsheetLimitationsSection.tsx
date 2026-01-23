import { FileSpreadsheet, X, ArrowRight } from "lucide-react";

const painPoints = [
  {
    text: "Fórmulas quebram sem você perceber",
    emphasis: "prejuízo silencioso",
  },
  {
    text: "Impossível usar no celular ou na correria",
    emphasis: "perde tempo",
  },
  {
    text: "Não calcula taxas de iFood, cupons e canais",
    emphasis: "margem errada",
  },
  {
    text: "Mostra números, mas esconde o lucro real",
    emphasis: "falsa segurança",
  },
];

export function SpreadsheetLimitationsSection() {
  return (
    <section className="py-16 lg:py-20 bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted border border-border mb-6">
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Por que planilhas param de funcionar
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Planilhas ajudam no começo. Mas quando o negócio cresce, elas viram{" "}
              <span className="text-foreground font-medium">fonte de erro, retrabalho e prejuízo</span>.
            </p>
          </div>

          {/* Pain points grid */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border hover:border-destructive/30 transition-colors group"
              >
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {point.text}
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    → {point.emphasis}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Transition */}
          <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <p className="text-foreground font-medium mb-2">
              Por isso criamos o Precify
            </p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              Uma plataforma feita para precificar certo
              <ArrowRight className="w-4 h-4 text-primary" />
              todos os dias, em qualquer dispositivo
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
