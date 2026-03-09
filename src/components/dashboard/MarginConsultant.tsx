import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope } from "lucide-react";
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
  Target,
  Search,
  FileSpreadsheet,
  Layers,
  Eye,
  Zap,
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
  DrawerClose,
} from "@/components/ui/drawer";
import {
  type SimResult,
  type SimFormData,
  type MarginClass,
  calculate,
  saveLastSimulation,
  loadLastSimulation,
} from "@/lib/margin-engine";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { generateSingleRecommendation, type DrMargemRecommendation } from "@/lib/dr-margem-engine";

type SimState = "idle" | "calculating" | "result" | "error";

interface RecipeOption {
  id: string;
  name: string;
  total_cost: number;
  selling_price: number | null;
  cost_per_serving: number;
  servings: number;
}

interface DrMargemTestPayload {
  productName: string;
  price: number;
  cost: number;
  nonce: number;
}

// ── Visual config per classification ─────────────────────────────────────
const classificationConfig: Record<
  MarginClass,
  { color: string; bg: string; border: string; icon: typeof ShieldCheck; emoji: string }
> = {
  healthy:  { color: "text-success",            bg: "bg-success/10",      border: "border-success/30",      icon: ShieldCheck,   emoji: "🟢" },
  ok:       { color: "text-primary",            bg: "bg-primary/10",      border: "border-primary/30",      icon: TrendingUp,    emoji: "🔵" },
  tight:    { color: "text-warning-foreground",  bg: "bg-warning/10",     border: "border-warning/30",      icon: AlertTriangle, emoji: "🟡" },
  critical: { color: "text-destructive",        bg: "bg-destructive/10",  border: "border-destructive/30",  icon: TrendingDown,  emoji: "🔴" },
  loss:     { color: "text-destructive",        bg: "bg-destructive/15",  border: "border-destructive/40",  icon: TrendingDown,  emoji: "🔴" },
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

// ── Product Selector ─────────────────────────────────────────────────────
function ProductSelector({
  recipes,
  onSelect,
}: {
  recipes: RecipeOption[];
  onSelect: (recipe: RecipeOption) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes.slice(0, 8);
    const q = search.toLowerCase();
    return recipes.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 8);
  }, [recipes, search]);

  if (!recipes.length) return null;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground">Preencher com produto cadastrado</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">Nenhum produto encontrado</p>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                onClick={() => { onSelect(r); setOpen(false); setSearch(""); }}
              >
                <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatCurrency(r.cost_per_serving)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────
function SimulatorForm({
  onResult,
  simState,
  recipes,
  prefillPayload,
}: {
  onResult: (form: SimFormData) => void;
  simState: SimState;
  recipes: RecipeOption[];
  prefillPayload: DrMargemTestPayload | null;
}) {
  const [form, setForm] = useState(initialForm);
  const [autoFilled, setAutoFilled] = useState(false);

  const update = (field: string, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setForm((prev) => ({ ...prev, [field]: sanitized }));
    setAutoFilled(false);
  };

  const handleSelectRecipe = (recipe: RecipeOption) => {
    setForm({
      ...initialForm,
      productName: recipe.name,
      productCost: recipe.cost_per_serving.toFixed(2).replace(".", ","),
      sellingPrice: recipe.selling_price ? recipe.selling_price.toFixed(2).replace(".", ",") : "",
    });
    setAutoFilled(true);
  };

  useEffect(() => {
    if (!prefillPayload) return;

    setForm({
      ...initialForm,
      productName: prefillPayload.productName || "",
      sellingPrice: prefillPayload.price > 0 ? prefillPayload.price.toFixed(2).replace(".", ",") : "",
      productCost: prefillPayload.cost > 0 ? prefillPayload.cost.toFixed(2).replace(".", ",") : "",
    });
    setAutoFilled(true);
  }, [prefillPayload]);

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

  const handleClear = () => { setForm(initialForm); setAutoFilled(false); };

  const fields: { key: string; label: string; placeholder: string; icon: typeof DollarSign; suffix?: string }[] = [
    { key: "sellingPrice", label: "Preço de venda", placeholder: "0,00", icon: DollarSign },
    { key: "productCost", label: "Custo do produto", placeholder: "0,00", icon: DollarSign },
    { key: "packagingCost", label: "Embalagem", placeholder: "0,00", icon: Package },
    { key: "ifoodFee", label: "Taxa iFood", placeholder: "0", icon: Percent, suffix: "%" },
    { key: "discount", label: "Desconto", placeholder: "0,00", icon: DollarSign },
    { key: "adCost", label: "Anúncio", placeholder: "0,00", icon: DollarSign },
    { key: "otherCosts", label: "Outros custos", placeholder: "0,00", icon: DollarSign },
  ];

  return (
    <div className="space-y-3">
      {/* Product selector */}
      <ProductSelector recipes={recipes} onSelect={handleSelectRecipe} />

      {/* Product name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Produto</label>
        <Input
          className="h-11 text-base"
          placeholder="Ex: X-Burguer"
          value={form.productName}
          onChange={(e) => setForm((prev) => ({ ...prev, productName: e.target.value }))}
        />
        {autoFilled && (
          <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Preenchido automaticamente — edite à vontade sem alterar seu cadastro
          </p>
        )}
      </div>

      {/* Input fields */}
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
          <div className="relative">
            <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              inputMode="decimal"
              className="pl-9 h-11 text-base"
              placeholder={f.placeholder}
              value={(form as any)[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
            />
            {f.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.suffix}</span>
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
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={handleClear} title="Limpar">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Simulação apenas — nenhum dado do seu cadastro será alterado
      </p>
    </div>
  );
}

// ── Result display ───────────────────────────────────────────────────────
function ResultCards({ result, onReset, onNewScenario }: { result: SimResult; onReset: () => void; onNewScenario: () => void }) {
  const cfg = classificationConfig[result.classification];
  const ClassIcon = cfg.icon;
  const navigate = useNavigate();

  // Dr. Margem inline recommendation
  const drRec = useMemo(() => {
    return generateSingleRecommendation({
      name: result.productName,
      total_cost: result.totalCost,
      selling_price: result.sellingPrice,
      cost_per_serving: result.totalCost,
    });
  }, [result]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Classification hero */}
      <div className={`rounded-xl ${cfg.bg} ${cfg.border} border p-4 text-center`}>
        <span className="text-2xl">{cfg.emoji}</span>
        <p className={`text-lg font-bold ${cfg.color} mt-1`}>{result.classLabel}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{result.productName}</p>
      </div>

      {/* Core metrics — 2 columns mobile */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Lucro estimado</p>
          <p className={`text-xl font-bold ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(result.profit)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Margem estimada</p>
          <p className={`text-xl font-bold ${result.margin >= 20 ? "text-success" : result.margin >= 5 ? "text-warning-foreground" : "text-destructive"}`}>
            {result.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
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

      {/* Dr. Margem inline */}
      {drRec && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Dr. Margem diz:</p>
              <p className="text-sm text-foreground leading-relaxed">{drRec.message}</p>
              {drRec.priceSuggestion && (
                <p className="text-xs text-primary font-medium mt-1.5">{drRec.priceSuggestion}</p>
              )}
            </div>
          </div>
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
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Teste de cenário
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
              <p className="text-[10px] text-muted-foreground">Impacto</p>
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

      {/* Action buttons — grid 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 text-sm" onClick={onNewScenario}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Novo cenário
        </Button>
        <Button variant="outline" className="h-11 text-sm" onClick={() => navigate("/app/recipes")}>
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          Fichas técnicas
        </Button>
        <Button variant="outline" className="h-11 text-sm" onClick={() => navigate("/app/combos")}>
          <Layers className="w-3.5 h-3.5 mr-1.5" />
          Criar combo
        </Button>
        <Button variant="outline" className="h-11 text-sm" onClick={onReset}>
          <Calculator className="w-3.5 h-3.5 mr-1.5" />
          Limpar tudo
        </Button>
      </div>
    </div>
  );
}

// ── Last simulation summary ──────────────────────────────────────────────
function LastSimSummary({ sim }: { sim: SimResult }) {
  const cfg = classificationConfig[sim.classification];

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Última simulação</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{sim.productName}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(sim.sellingPrice)} · Lucro {formatCurrency(sim.profit)}
          </p>
        </div>
        <div className={`text-right flex-shrink-0`}>
          <span className="text-lg">{cfg.emoji}</span>
          <p className={`text-xs font-bold ${cfg.color}`}>{sim.margin.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────
function EmptyHint() {
  return (
    <p className="text-xs text-muted-foreground/70 mt-3 italic leading-relaxed">
      Veja em segundos se esse preço dá lucro, margem apertada ou prejuízo.
    </p>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export default function MarginConsultant() {
  const [expanded, setExpanded] = useState(false);
  const [simState, setSimState] = useState<SimState>("idle");
  const [result, setResult] = useState<SimResult | null>(null);
  const [previousResult, setPreviousResult] = useState<SimResult | null>(null);
  const [lastSaved, setLastSaved] = useState<SimResult | null>(null);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const isMobile = useIsMobile();
  const { activeStore } = useStore();

  // Load last simulation + recipes
  useEffect(() => {
    const saved = loadLastSimulation();
    if (saved) setLastSaved(saved);

    const fetchRecipes = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let query = supabase
        .from("recipes")
        .select("id, name, total_cost, selling_price, cost_per_serving, servings")
        .eq("user_id", session.user.id)
        .order("name");

      if (activeStore?.id) query = query.eq("store_id", activeStore.id);

      const { data } = await query;
      if (data) setRecipes(data as RecipeOption[]);
    };

    fetchRecipes();
  }, [activeStore?.id]);

  const handleFormSubmit = useCallback(
    (formData: SimFormData) => {
      setSimState("calculating");
      const prev = result || lastSaved;
      setTimeout(() => {
        const r = calculate(formData, prev);
        setPreviousResult(prev);
        setResult(r);
        saveLastSimulation(r);
        setLastSaved(r);
        setSimState("result");
      }, 300);
    },
    [result, lastSaved],
  );

  const handleReset = () => {
    if (result) setPreviousResult(result);
    setResult(null);
    setSimState("idle");
  };

  const handleFullClear = () => {
    setPreviousResult(null);
    setResult(null);
    setSimState("idle");
  };

  const openSimulator = () => {
    setExpanded(true);
    handleReset();
  };

  // ── Simulator content (shared between mobile drawer and desktop expand)
  const simulatorContent = (
    <>
      {simState === "calculating" ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-muted-foreground">Calculando...</span>
        </div>
      ) : simState === "result" && result ? (
        <ResultCards result={result} onReset={handleFullClear} onNewScenario={handleReset} />
      ) : (
        <SimulatorForm onResult={handleFormSubmit} simState={simState} recipes={recipes} />
      )}
    </>
  );

  // ── Card header (shared) ──
  const cardHeader = (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Calculator className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-base sm:text-lg text-foreground">
          Simulador de Lucro
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Descubra em segundos se esse produto dá lucro, margem apertada ou prejuízo.
        </p>
      </div>
    </div>
  );

  // ── Mobile: bottom sheet ──
  if (isMobile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        {cardHeader}

        {lastSaved && <LastSimSummary sim={lastSaved} />}
        {!lastSaved && <EmptyHint />}

        <Drawer>
          <DrawerTrigger asChild>
            <Button className="w-full mt-3 h-12 text-base font-semibold" onClick={handleReset}>
              <Sparkles className="w-4 h-4 mr-2" />
              {lastSaved ? "Testar cenário" : "Simular agora"}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[92vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <Calculator className="w-5 h-5 text-primary" />
                Simulador de Lucro
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">{simulatorContent}</div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // ── Desktop: expandable card ──
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300">
      {/* Header — clickable */}
      <button
        className="w-full p-5 sm:p-6 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => { setExpanded(!expanded); if (!expanded) handleReset(); }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg text-foreground">
            Simulador de Lucro
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            Descubra em segundos se esse produto dá lucro, margem apertada ou prejuízo.
          </p>
          {!expanded && lastSaved && <LastSimSummary sim={lastSaved} />}
          {!expanded && !lastSaved && <EmptyHint />}
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
          <div className="max-w-lg">{simulatorContent}</div>
        </div>
      )}

      {/* CTA when collapsed */}
      {!expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <Button className="w-full sm:w-auto h-11 text-base font-semibold" onClick={openSimulator}>
            <Sparkles className="w-4 h-4 mr-2" />
            {lastSaved ? "Testar cenário" : "Simular agora"}
          </Button>
        </div>
      )}
    </div>
  );
}
