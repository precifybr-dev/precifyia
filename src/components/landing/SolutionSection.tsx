import { useState, useRef, useEffect } from "react";
import {
  Calculator, Receipt, DollarSign, FileBarChart, TrendingUp, Store,
  AlertTriangle, FileSpreadsheet, CheckCircle2, ArrowRight, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const pillars = [
  { icon: Calculator, label: "Custo dos pratos", problem: "Fórmulas manuais e erros" },
  { icon: Receipt, label: "Taxas do iFood", problem: "Percentuais desatualizados" },
  { icon: DollarSign, label: "Precificação", problem: "Preço no chute" },
  { icon: FileBarChart, label: "DRE simplificado", problem: "Planilha complexa" },
  { icon: TrendingUp, label: "Margem de lucro", problem: "Prejuízo invisível" },
  { icon: Store, label: "Multi-loja", problem: "Uma planilha por loja" },
];

const results = [
  "Custos precisos",
  "Taxas reais",
  "Preço ideal",
  "DRE automático",
  "Margem garantida",
  "Multi-loja fácil",
];

function WithoutPrecify() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Diagram: scattered chaos layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map((p, i) => (
          <div
            key={i}
            className="group relative"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Main task */}
            <div className="relative rounded-xl border-2 border-destructive/20 bg-card p-4 transition-all duration-300 hover:border-destructive/40 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-lg bg-muted p-2.5">
                  <p.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">{p.label}</p>
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-destructive/70 shrink-0" />
                    <span className="text-xs text-muted-foreground">Excel</span>
                  </div>
                </div>
              </div>

              {/* Problem badge */}
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/8 border border-destructive/15 px-3 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-xs text-destructive font-medium">{p.problem}</span>
              </div>
            </div>

            {/* Connecting line down (on mobile between items) */}
            {i < pillars.length - 1 && (
              <div className="flex justify-center py-1 sm:hidden">
                <div className="w-px h-3 bg-destructive/20" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom result bar */}
      <div className="mt-6 rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <X className="h-5 w-5 text-destructive" />
          <span className="text-sm font-bold text-destructive">
            Retrabalho, erros e prejuízo todos os meses
          </span>
        </div>
      </div>
    </div>
  );
}

function WithPrecify() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Top row: pillar cards in a hub layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {pillars.map((p, i) => (
          <div
            key={i}
            className="relative rounded-xl border-2 border-primary/20 bg-card p-4 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-3">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">
                {p.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Connecting SVG lines */}
      <div className="flex justify-center py-4">
        <svg width="200" height="40" viewBox="0 0 200 40" className="text-primary">
          <path d="M 20 0 L 20 15 Q 20 20 25 20 L 100 20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M 100 0 L 100 20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M 180 0 L 180 15 Q 180 20 175 20 L 100 20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M 100 20 L 100 40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
          <circle cx="100" cy="20" r="4" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* Central Precify hub */}
      <div className="flex justify-center">
        <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 sm:p-8 text-center shadow-xl shadow-primary/20 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle2 className="h-7 w-7" />
              <span className="text-2xl font-display font-bold">Precify</span>
            </div>
            <p className="text-sm opacity-90 mb-4">Tudo integrado, automático e sem erro</p>

            {/* Result badges */}
            <div className="flex flex-wrap justify-center gap-2">
              {results.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium"
                >
                  <Check className="h-3 w-3" /> {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SolutionSection() {
  const [activeTab, setActiveTab] = useState<"com" | "sem">("com");
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const switchTab = (tab: "com" | "sem") => {
    if (tab === activeTab || isAnimating) return;
    setIsAnimating(true);

    // Fade out
    if (contentRef.current) {
      contentRef.current.style.opacity = "0";
      contentRef.current.style.transform = "scale(0.97) translateY(8px)";
    }

    setTimeout(() => {
      setActiveTab(tab);
      // Fade in
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.style.opacity = "1";
          contentRef.current.style.transform = "scale(1) translateY(0)";
        }
        setTimeout(() => setIsAnimating(false), 400);
      });
    }, 300);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.opacity = "1";
      contentRef.current.style.transform = "scale(1) translateY(0)";
    }
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-muted/30 overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4 leading-tight">
            Aqui sua empresa tem tudo que precisa{" "}
            <span className="text-primary">em um só lugar</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Veja a diferença entre gerenciar seu restaurante com planilhas ou com o Precify.
          </p>
        </div>

        {/* Toggle - Asaas style with sliding indicator */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="relative inline-flex rounded-full bg-muted p-1.5 shadow-inner">
            {/* Sliding background indicator */}
            <div
              className={cn(
                "absolute top-1.5 bottom-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-md",
                activeTab === "sem"
                  ? "bg-destructive left-[calc(50%+2px)] right-1.5"
                  : "bg-primary left-1.5 right-[calc(50%+2px)]"
              )}
            />

            <button
              onClick={() => switchTab("com")}
              className={cn(
                "relative z-10 rounded-full px-5 sm:px-7 py-2.5 text-sm font-semibold transition-colors duration-300 min-w-[140px]",
                activeTab === "com"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                Com o Precify
              </span>
            </button>

            <button
              onClick={() => switchTab("sem")}
              className={cn(
                "relative z-10 rounded-full px-5 sm:px-7 py-2.5 text-sm font-semibold transition-colors duration-300 min-w-[140px]",
                activeTab === "sem"
                  ? "text-destructive-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <X className="h-4 w-4" />
                Sem o Precify
              </span>
            </button>
          </div>
        </div>

        {/* Content with crossfade + scale animation */}
        <div
          ref={contentRef}
          className="transition-all duration-400 ease-out"
          style={{
            transitionProperty: "opacity, transform",
            transitionDuration: "400ms",
            transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {activeTab === "sem" ? <WithoutPrecify /> : <WithPrecify />}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <Button asChild variant="hero" size="xl">
            <Link to="/register">
              Teste grátis por 7 dias
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
