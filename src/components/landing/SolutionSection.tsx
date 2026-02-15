import { useState } from "react";
import { Calculator, Receipt, DollarSign, FileBarChart, TrendingUp, Store, AlertTriangle, FileSpreadsheet, ArrowDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const pillars = [
  { icon: Calculator, label: "Calcular custo dos pratos", problem: "Fórmulas manuais no Excel, erros de digitação" },
  { icon: Receipt, label: "Controlar taxas do iFood", problem: "Percentuais desatualizados, taxa real desconhecida" },
  { icon: DollarSign, label: "Montar precificação", problem: "Chute no preço, sem base técnica" },
  { icon: FileBarChart, label: "Fazer DRE simplificado", problem: "Planilha complexa, dados inconsistentes" },
  { icon: TrendingUp, label: "Conferir margem de lucro", problem: "Margem errada, prejuízo invisível" },
  { icon: Store, label: "Gerenciar multi-loja", problem: "Uma planilha por loja, caos total" },
];

function WithoutPrecify() {
  return (
    <div className="space-y-3">
      {pillars.map((p, i) => (
        <div key={i} className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3">
          {/* Task card */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 flex-1 min-w-0">
            <div className="shrink-0 rounded-md bg-muted p-2">
              <p.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground leading-tight">{p.label}</span>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center shrink-0 text-muted-foreground">
            <ArrowDown className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:block text-lg">→</span>
          </div>

          {/* Excel / problem card */}
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 sm:p-4 flex-1 min-w-0">
            <div className="shrink-0 rounded-md bg-destructive/10 p-2">
              <FileSpreadsheet className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-sm text-muted-foreground leading-tight">{p.problem}</span>
          </div>

          {/* Arrow to error */}
          <div className="flex items-center justify-center shrink-0 text-muted-foreground">
            <ArrowDown className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:block text-lg">→</span>
          </div>

          {/* Error result */}
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:p-4 sm:w-40 shrink-0 justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs font-medium text-destructive">Risco de prejuízo</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WithPrecify() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pillar cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {pillars.map((p, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary/30 bg-card p-4 text-center shadow-sm"
          >
            <div className="rounded-md bg-primary/10 p-2">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Connecting arrows */}
      <div className="flex flex-col items-center gap-1 text-primary">
        <ArrowDown className="h-5 w-5" />
        <ArrowDown className="h-5 w-5 -mt-2 opacity-60" />
      </div>

      {/* Central Precify block */}
      <div className="w-full max-w-sm rounded-2xl bg-primary text-primary-foreground p-6 text-center shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-xl font-display font-bold">Precify</span>
        </div>
        <p className="text-sm opacity-90">Tudo integrado, automático e sem erro</p>
      </div>

      {/* Result badges */}
      <div className="flex flex-wrap justify-center gap-2">
        {["Custos precisos", "Taxas reais", "Preço ideal", "DRE automático", "Margem garantida", "Multi-loja fácil"].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3 w-3" /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SolutionSection() {
  const [activeTab, setActiveTab] = useState<"com" | "sem">("com");

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
            Aqui sua empresa tem tudo que precisa{" "}
            <span className="text-primary">em um só lugar</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Veja a diferença entre gerenciar seu restaurante com planilhas ou com o Precify.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full bg-muted p-1 gap-1">
            <button
              onClick={() => setActiveTab("com")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                activeTab === "com"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ✅ Com o Precify
            </button>
            <button
              onClick={() => setActiveTab("sem")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                activeTab === "sem"
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ❌ Sem o Precify
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          key={activeTab}
          className="animate-fade-in"
        >
          {activeTab === "sem" ? <WithoutPrecify /> : <WithPrecify />}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button asChild variant="hero" size="xl">
            <Link to="/register">Teste grátis por 7 dias</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
