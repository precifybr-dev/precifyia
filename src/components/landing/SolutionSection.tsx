import { ArrowRight, ClipboardList, FileSpreadsheet, BarChart3, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: FileSpreadsheet,
    title: "Cadastre seus insumos",
    description: "Insira manualmente ou importe de uma planilha em segundos.",
  },
  {
    icon: ClipboardList,
    title: "Crie a ficha técnica",
    description: "Monte a receita de cada produto com as quantidades usadas.",
  },
  {
    icon: BarChart3,
    title: "Veja o custo real completo",
    description: "O sistema calcula custo, impostos e taxas automaticamente.",
  },
  {
    icon: DollarSign,
    title: "Descubra seu lucro líquido",
    description: "Lucro por produto, separado por Loja e iFood.",
  },
  {
    icon: TrendingUp,
    title: "Receba o preço ideal",
    description: "Sugestão de preço baseada na margem que você escolher.",
  },
];

export function SolutionSection() {
  return (
    <section id="como-funciona" className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja seu lucro real em poucos minutos.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sem planilha complicada. Você insere os dados e o sistema faz o
            resto.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative text-center p-6 rounded-2xl bg-card border border-border"
              >
                <div className="relative mb-4 inline-flex">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link to="/register">
            <Button
              size="lg"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group"
            >
              Começar a Precificar Certo
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
