import { useState, useCallback, useEffect } from "react";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  ShieldCheck,
  Package,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Tag,
  Info,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  type SimResult,
  type SimFormData,
  type MarginClass,
  calculate,
  saveLastSimulation,
  loadLastSimulation,
  clearLastSimulation,
} from "@/lib/margin-engine";

type SimState = "idle" | "calculating" | "result" | "error";

// ── Visual config per classification ─────────────────────────────────────
const classificationConfig: Record<
  MarginClass,
  { color: string; bg: string; border: string; icon: typeof ShieldCheck }
> = {
  healthy:  { color: "text-success",           bg: "bg-success/10",     border: "border-success/30",     icon: ShieldCheck },
  ok:       { color: "text-primary",           bg: "bg-primary/10",     border: "border-primary/30",     icon: TrendingUp },
  tight:    { color: "text-warning-foreground", bg: "bg-warning/10",    border: "border-warning/30",     icon: AlertTriangle },
  critical: { color: "text-destructive",       bg: "bg-destructive/10", border: "border-destructive/30", icon: TrendingDown },
  loss:     { color: "text-destructive",       bg: "bg-destructive/10", border: "border-destructive/30", icon: TrendingDown },
};

const initialForm = {
  productName: "",
  sellingPrice: "",
  productCost: "",
  packagingCost: "",
  ifoodFee: "",
  discount: "",
  adCost: "",
  otherCosts: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────
const num = (v: string) => {
  if (!v) return 0;
  return parseFloat(v.replace(",", ".")) || 0;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// ── Form ─────────────────────────────────────────────────────────────────
function SimulatorForm({
  onResult,
  simState,
}: {
  onResult: (form: SimFormData) => void;
  simState: SimState;
}) {
  const [form, setForm] = useState(initialForm);

  const update = (field: string, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setForm((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleCalculate = () => {
    const selling = num(form.sellingPrice);
    if (selling <= 0) return;

    onResult({
      productName: form.productName.trim(),
      sellingPrice: selling,
      productCost: num(form.productCost),
      packagingCost: num(form.packagingCost),
      ifoodFeePercent: num(form.ifoodFee),
      discount: num(form.discount),
      adCost: num(form.adCost),
      otherCosts: num(form.otherCosts),
    });
  };

  const handleClear = () => setForm(initialForm);

  const fields: { key: string; label: string; placeholder: string; icon: typeof DollarSign; suffix?: string }[] = [
    { key: "productName", label: "Produto (opcional)", placeholder: "Ex: X-Burguer", icon: Package },
    { key: "sellingPrice", label: "Preço de venda", placeholder: "0,00", icon: DollarSign },
    { key: "productCost", label: "Custo do produto", placeholder: "0,00", icon: DollarSign },
    { key: "packagingCost", label: "Custo de embalagem", placeholder: "0,00", icon: DollarSign },
    { key: "ifoodFee", label: "Taxa iFood", placeholder: "0", icon: Percent, suffix: "%" },
    { key: "discount", label: "Desconto aplicado", placeholder: "0,00", icon: DollarSign },
    { key: "adCost", label: "Custo de anúncio", placeholder: "0,00", icon: DollarSign },
    { key: "otherCosts", label: "Outros custos", placeholder: "0,00", icon: DollarSign },
  ];

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {f.label}
          </label>
          <div className="relative">
            <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              inputMode={f.key === "productName" ? "text" : "decimal"}
              className="pl-9 h-11 text-base"
              placeholder={f.placeholder}
              value={(form as any)[f.key]}
              onChange={(e) =>
                f.key === "productName"
                  ? setForm((prev) => ({ ...prev, productName: e.target.value }))
                  : update(f.key, e.target.value)
              }
            />
            {f.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {f.suffix}
              </span>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleCalculate}
          className="flex-1 h-12 text-base font-semibold"
          disabled={simState === "calculating" || !num(form.sellingPrice)}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calcular resultado
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={handleClear}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Result display ───────────────────────────────────────────────────────
function ResultCards({ result, onReset }: { result: SimResult; onReset: () => void }) {
  const cfg = classificationConfig[result.classification];
  const ClassIcon = cfg.icon;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Core metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Lucro estimado</span>
          </div>
          <p className={`text-xl font-bold ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(result.profit)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Margem estimada</span>
          </div>
          <p className={`text-xl font-bold ${result.margin >= 20 ? "text-success" : result.margin >= 5 ? "text-warning-foreground" : "text-destructive"}`}>
            {result.margin.toFixed(1)}%
          </p>
        </div>

        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <ClassIcon className={`w-4 h-4 ${cfg.color}`} />
            <span className="text-xs text-muted-foreground">Classificação</span>
          </div>
          <p className={`text-lg font-bold ${cfg.color}`}>{result.classLabel}</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Recomendação
        </h4>
        <p className="text-sm text-foreground leading-relaxed mb-2">{result.recommendation}</p>
        {result.suggestions.length > 0 && (
          <ul className="space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ArrowRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conditional alerts */}
      {result.alerts.length > 0 && (
        <div className="space-y-2">
          {result.alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 flex items-start gap-2 text-xs ${
                alert.type === "danger"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-warning/10 text-warning-foreground border border-warning/20"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Price suggestions */}
      {result.priceSuggestions.some((ps) => ps.price > 0) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Sugestão de preço
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {result.priceSuggestions.map((ps) =>
              ps.price > 0 ? (
                <div key={ps.label} className="text-center rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{ps.label}</p>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(ps.price)}</p>
                  <p className="text-[10px] text-muted-foreground">margem {ps.targetMargin}%</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Scenario comparison */}
      {result.comparison && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Comparação com cenário anterior
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Lucro</p>
              <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${result.comparison.profitDiff >= 0 ? "text-success" : "text-destructive"}`}>
                {result.comparison.profitDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatCurrency(Math.abs(result.comparison.profitDiff))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Margem</p>
              <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${result.comparison.marginDiff >= 0 ? "text-success" : "text-destructive"}`}>
                {result.comparison.marginDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(result.comparison.marginDiff).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Preço</p>
              <p className="text-sm font-bold text-foreground">
                {result.comparison.priceDiff >= 0 ? "+" : ""}{formatCurrency(result.comparison.priceDiff)}
              </p>
            </div>
          </div>
          <p className={`text-xs font-medium ${result.comparison.improved ? "text-success" : "text-destructive"}`}>
            {result.comparison.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Testar novo cenário
        </Button>
      </div>
    </div>
  );
}

// ── Last simulation summary card ─────────────────────────────────────────
function LastSimCard({ sim, onNew }: { sim: SimResult; onNew: () => void }) {
  const cfg = classificationConfig[sim.classification];

  return (
    <div className="flex items-center gap-3 mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Última simulação</p>
        <p className="text-sm font-semibold text-foreground truncate">{sim.productName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={`text-xs font-medium ${cfg.color}`}>{sim.margin.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">{formatCurrency(sim.profit)}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs" onClick={onNew}>
        Simular
      </Button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export default function MarginConsultant() {
  const [expanded, setExpanded] = useState(false);
  const [simState, setSimState] = useState<SimState>("idle");
  const [result, setResult] = useState<SimResult | null>(null);
  const [previousResult, setPreviousResult] = useState<SimResult | null>(null);
  const [lastSaved, setLastSaved] = useState<SimResult | null>(null);
  const isMobile = useIsMobile();

  // Load last simulation on mount
  useEffect(() => {
    const saved = loadLastSimulation();
    if (saved) setLastSaved(saved);
  }, []);

  const handleFormSubmit = useCallback(
    (formData: SimFormData) => {
      setSimState("calculating");
      // Keep previous result for comparison
      const prev = result || lastSaved;
      setTimeout(() => {
        const r = calculate(formData, prev);
        setPreviousResult(prev);
        setResult(r);
        saveLastSimulation(r);
        setLastSaved(r);
        setSimState("result");
      }, 350);
    },
    [result, lastSaved],
  );

  const handleReset = () => {
    // Keep previous result for comparison on next calculation
    if (result) setPreviousResult(result);
    setResult(null);
    setSimState("idle");
  };

  const openSimulator = () => {
    setExpanded(true);
    handleReset();
  };

  // Mobile: use Drawer (bottom sheet)
  if (isMobile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-base text-foreground">
              Consultor de Margem
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Simule preço, custo e taxas para entender se o produto realmente dá lucro.
            </p>
          </div>
        </div>

        {!lastSaved && (
          <p className="text-xs text-muted-foreground/70 mt-3 italic">
            Exemplo: produto vendido por R$32,90 pode gerar lucro de R$4,10 dependendo do custo.
          </p>
        )}

        {lastSaved && !expanded && <LastSimCard sim={lastSaved} onNew={() => {}} />}

        <Drawer>
          <DrawerTrigger asChild>
            <Button className="w-full mt-3 h-11 text-base font-semibold" onClick={() => { handleReset(); }}>
              <Sparkles className="w-4 h-4 mr-2" />
              Simular cenário
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Consultor de Margem
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">
              {simState === "calculating" ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-3 text-sm text-muted-foreground">Calculando...</span>
                </div>
              ) : simState === "result" && result ? (
                <ResultCards result={result} onReset={handleReset} />
              ) : (
                <SimulatorForm onResult={handleFormSubmit} simState={simState} />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // Desktop: expand inline
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300">
      {/* Header */}
      <button
        className="w-full p-5 sm:p-6 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => { setExpanded(!expanded); if (!expanded) handleReset(); }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg text-foreground">
            Consultor de Margem
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            Simule preço, custo e taxas para entender se o produto realmente dá lucro.
          </p>
          {!expanded && !lastSaved && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Exemplo: produto vendido por R$32,90 pode gerar lucro de R$4,10 dependendo do custo.
            </p>
          )}
          {!expanded && lastSaved && <LastSimCard sim={lastSaved} onNew={openSimulator} />}
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {simState === "calculating" ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">Calculando...</span>
            </div>
          ) : simState === "result" && result ? (
            <ResultCards result={result} onReset={handleReset} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <SimulatorForm onResult={handleFormSubmit} simState={simState} />
            </div>
          )}
        </div>
      )}

      {/* CTA when collapsed */}
      {!expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <Button
            className="w-full sm:w-auto h-11 text-base font-semibold"
            onClick={openSimulator}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Simular cenário
          </Button>
        </div>
      )}
    </div>
  );
}
