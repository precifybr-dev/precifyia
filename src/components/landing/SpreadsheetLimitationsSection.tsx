import { FileSpreadsheet, AlertCircle } from "lucide-react";

const painPoints = [
  "Fórmulas quebram sem perceber",
  "Difícil usar no celular ou na cozinha",
  "Não acompanham taxas, cupons e canais de venda",
  "Mostram números, mas não mostram lucro",
];

export function SpreadsheetLimitationsSection() {
  return (
    <section className="py-12 lg:py-16 bg-background border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header with Excel icon */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <FileSpreadsheet className="w-6 h-6 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">
              Por que planilhas começam a falhar
            </h3>
          </div>

          {/* Supporting text */}
          <p className="text-center text-muted-foreground text-sm mb-8 max-w-lg mx-auto leading-relaxed">
            Planilhas ajudam no começo.
            <br />
            No dia a dia de quem vende comida, elas começam a gerar erro, retrabalho e prejuízo.
          </p>

          {/* Pain points list */}
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <AlertCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* Transition phrase */}
          <p className="text-center text-sm text-foreground/80 font-medium">
            Por isso criamos uma plataforma pensada para precificar corretamente, todos os dias.
          </p>
        </div>
      </div>
    </section>
  );
}
