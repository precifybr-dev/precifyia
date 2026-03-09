import { useState, useCallback } from "react";
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

type SimState = "idle" | "calculating" | "result" | "error";

interface SimResult {
  profit: number;
  margin: number;
  classification: "healthy" | "tight" | "risk";
}

const classificationConfig = {
  healthy: {
    label: "Saudável",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    icon: ShieldCheck,
  },
  tight: {
    label: "Margem apertada",
    color: "text-warning-foreground",
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: AlertTriangle,
  },
  risk: {
    label: "Risco / Prejuízo",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: TrendingDown,
  },
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

function SimulatorForm({
  onResult,
  simState,
}: {
  onResult: (r: SimResult) => void;
  simState: SimState;
}) {
  const [form, setForm] = useState(initialForm);

  const update = (field: string, value: string) => {
    // allow only numbers, comma, dot
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setForm((prev) => ({ ...prev, [field]: sanitized }));
  };

  const num = (v: string) => {
    if (!v) return 0;
    return parseFloat(v.replace(",", ".")) || 0;
  };

  const handleCalculate = () => {
    const selling = num(form.sellingPrice);
    if (selling <= 0) return;

    const totalCost =
      num(form.productCost) +
      num(form.packagingCost) +
      selling * (num(form.ifoodFee) / 100) +
      num(form.discount) +
      num(form.adCost) +
      num(form.otherCosts);

    const profit = selling - totalCost;
    const margin = (profit / selling) * 100;

    let classification: SimResult["classification"] = "healthy";
    if (margin < 0) classification = "risk";
    else if (margin < 15) classification = "tight";

    onResult({ profit, margin, classification });
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

function ResultCards({ result, onReset }: { result: SimResult; onReset: () => void }) {
  const cfg = classificationConfig[result.classification];
  const ClassIcon = cfg.icon;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Result cards */}
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
          <p className={`text-xl font-bold ${result.margin >= 15 ? "text-success" : result.margin >= 0 ? "text-warning-foreground" : "text-destructive"}`}>
            {result.margin.toFixed(1)}%
          </p>
        </div>

        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <ClassIcon className={`w-4 h-4 ${cfg.color}`} />
            <span className="text-xs text-muted-foreground">Classificação</span>
          </div>
          <p className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Recomendação
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {result.classification === "healthy"
            ? "Boa margem! Considere otimizar custos de embalagem ou anúncio para maximizar ainda mais o lucro."
            : result.classification === "tight"
              ? "Margem apertada. Revise o preço de venda ou reduza custos para melhorar a rentabilidade."
              : "Atenção: este cenário gera prejuízo. Ajuste o preço de venda ou reduza custos urgentemente."}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Testar novo cenário
        </Button>
      </div>
    </div>
  );
}

export default function MarginConsultant() {
  const [expanded, setExpanded] = useState(false);
  const [simState, setSimState] = useState<SimState>("idle");
  const [result, setResult] = useState<SimResult | null>(null);
  const isMobile = useIsMobile();

  const handleResult = useCallback((r: SimResult) => {
    setSimState("calculating");
    // Simulate brief calculation delay
    setTimeout(() => {
      setResult(r);
      setSimState("result");
    }, 400);
  }, []);

  const handleReset = () => {
    setResult(null);
    setSimState("idle");
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

        <p className="text-xs text-muted-foreground/70 mt-3 italic">
          Exemplo: produto vendido por R$32,90 pode gerar lucro de R$4,10 dependendo do custo.
        </p>

        <Drawer>
          <DrawerTrigger asChild>
            <Button className="w-full mt-3 h-11 text-base font-semibold" onClick={handleReset}>
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
              {simState === "result" && result ? (
                <ResultCards result={result} onReset={handleReset} />
              ) : (
                <SimulatorForm onResult={handleResult} simState={simState} />
              )}
              {simState === "calculating" && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-3 text-sm text-muted-foreground">Calculando...</span>
                </div>
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
          {!expanded && (
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Exemplo: produto vendido por R$32,90 pode gerar lucro de R$4,10 dependendo do custo.
            </p>
          )}
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
              <SimulatorForm onResult={handleResult} simState={simState} />
            </div>
          )}
        </div>
      )}

      {/* CTA when collapsed */}
      {!expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <Button
            className="w-full sm:w-auto h-11 text-base font-semibold"
            onClick={() => { setExpanded(true); handleReset(); }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Simular cenário
          </Button>
        </div>
      )}
    </div>
  );
}
