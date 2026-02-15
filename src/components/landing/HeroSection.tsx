import { ArrowRight, Check, TrendingUp, DollarSign, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const bullets = [
  "Descubra sua margem real em menos de 1 minuto",
  "Pare de depender de planilhas confusas",
  "Ajuste preços sem medo de prejuízo",
];

/* ---- Floating mockup components ---- */

function PricingTableMockup() {
  const rows = [
    { name: "X-Bacon", cost: "R$ 8,50", price: "R$ 24,90", margin: "42%", good: true },
    { name: "X-Salada", cost: "R$ 6,20", price: "R$ 18,90", margin: "38%", good: true },
    { name: "Combo Família", cost: "R$ 22,00", price: "R$ 49,90", margin: "31%", good: true },
    { name: "Açaí 500ml", cost: "R$ 9,80", price: "R$ 15,90", margin: "12%", good: false },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-primary/5 p-3 w-full max-w-[320px] text-left">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 rounded-full bg-destructive" />
        <div className="w-2 h-2 rounded-full bg-warning" />
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-[10px] font-semibold text-muted-foreground ml-1">Ficha Técnica — Precify</span>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Produto</th>
            <th className="text-right py-1 px-1 font-semibold text-muted-foreground">Custo</th>
            <th className="text-right py-1 px-1 font-semibold text-muted-foreground">Venda</th>
            <th className="text-right py-1 px-1 font-semibold text-muted-foreground">Margem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 px-1 font-medium text-foreground">{r.name}</td>
              <td className="py-1.5 px-1 text-right text-muted-foreground">{r.cost}</td>
              <td className="py-1.5 px-1 text-right font-semibold text-foreground">{r.price}</td>
              <td className={`py-1.5 px-1 text-right font-bold ${r.good ? "text-success" : "text-destructive"}`}>
                {r.margin}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IfoodPriceMockup() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-primary/5 p-3 w-full max-w-[200px] text-left">
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md bg-destructive/10 p-1.5">
          <Utensils className="h-3.5 w-3.5 text-destructive" />
        </div>
        <span className="text-[10px] font-bold text-foreground">Preço iFood</span>
      </div>
      <div className="space-y-2">
        {[
          { name: "X-Bacon", price: "R$ 27,90", taxa: "23,5%" },
          { name: "X-Salada", price: "R$ 21,90", taxa: "23,5%" },
          { name: "Combo Família", price: "R$ 59,90", taxa: "12%" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
            <div>
              <p className="text-[10px] font-semibold text-foreground">{item.name}</p>
              <p className="text-[9px] text-muted-foreground">Taxa: {item.taxa}</p>
            </div>
            <span className="text-[11px] font-bold text-primary">{item.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarginAlertMockup() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-primary/5 p-3 w-full max-w-[220px] text-left">
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md bg-success/10 p-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
        </div>
        <span className="text-[10px] font-bold text-foreground">Margem por Canal</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Loja</span>
            <span className="font-bold text-success">42%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-success" style={{ width: "42%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">iFood</span>
            <span className="font-bold text-primary">28%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: "28%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Açaí 500ml</span>
            <span className="font-bold text-destructive">12%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-destructive" style={{ width: "12%" }} />
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-md bg-destructive/8 border border-destructive/15 px-2 py-1">
        <p className="text-[9px] text-destructive font-medium">⚠ Açaí com margem crítica!</p>
      </div>
    </div>
  );
}

function PriceTagMockup() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-primary/5 p-3 w-full max-w-[180px] text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <DollarSign className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-bold text-foreground">Preço Ideal</span>
      </div>
      <div className="rounded-lg bg-primary/5 border border-primary/15 p-2">
        <p className="text-[9px] text-muted-foreground line-through">R$ 22,00</p>
        <p className="text-lg font-bold text-primary">R$ 27,90</p>
        <p className="text-[9px] text-success font-semibold">+26% de margem</p>
      </div>
    </div>
  );
}

export function HeroSection() {
  const { trackEvent } = useFunnelTracking();
  return (
    <section className="relative pt-28 lg:pt-36 pb-10 lg:pb-14 bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-6">
            Você pode estar perdendo até 20% de lucro no iFood{" "}
            <span className="text-gradient">sem perceber.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            A maioria dos restaurantes usa planilha errada, fórmula quebrada ou
            esquece custos escondidos. O Precify calcula automaticamente o preço
            ideal e protege sua margem em segundos.
          </p>

          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-left">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{b}</span>
                </div>
              ))}
            </div>

            <Link to="/register" onClick={() => trackEvent("cta_click", "hero_cta")}>
              <Button
                size="xl"
                data-cta-id="hero_cta"
                className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-lg px-10"
              >
                Teste grátis por 7 dias
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground">
              Grátis por 7 dias · Sem cartão · Cancele quando quiser
            </p>
          </div>
        </div>

        {/* Floating feature mockups */}
        <div className="relative mt-4 sm:mt-8 max-w-5xl mx-auto">
          {/* Desktop: absolute positioned floating cards */}
          <div className="hidden lg:block relative h-[280px]">
            {/* Left: Pricing table */}
            <div className="absolute left-0 top-4 animate-float" style={{ animationDelay: "0s" }}>
              <PricingTableMockup />
            </div>

            {/* Center top: Price tag */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 animate-float" style={{ animationDelay: "1.5s" }}>
              <PriceTagMockup />
            </div>

            {/* Right top: iFood prices */}
            <div className="absolute right-0 top-0 animate-float" style={{ animationDelay: "0.5s" }}>
              <IfoodPriceMockup />
            </div>

            {/* Right bottom: Margin alert */}
            <div className="absolute right-8 bottom-0 animate-float" style={{ animationDelay: "2s" }}>
              <MarginAlertMockup />
            </div>
          </div>

          {/* Tablet: 2-column grid */}
          <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 justify-items-center">
            <PricingTableMockup />
            <IfoodPriceMockup />
          </div>

          {/* Mobile: stacked vertically */}
          <div className="sm:hidden flex flex-col gap-3 items-center">
            <PricingTableMockup />
            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
              <MarginAlertMockup />
              <PriceTagMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
