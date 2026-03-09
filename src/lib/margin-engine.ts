/**
 * Margin Consultant — Calculation Engine
 * Single source of truth for margin classification, alerts, recommendations, and price suggestions.
 */

// ── Classification bands (configurable in the future) ──────────────────────
export const MARGIN_BANDS = {
  loss:     { max: 0,   label: "Prejuízo",        key: "loss"     as const },
  critical: { max: 5,   label: "Margem crítica",   key: "critical" as const },
  tight:    { max: 12,  label: "Margem apertada",  key: "tight"    as const },
  ok:       { max: 20,  label: "Margem aceitável",  key: "ok"       as const },
  healthy:  { max: Infinity, label: "Margem saudável", key: "healthy" as const },
} as const;

export type MarginClass = keyof typeof MARGIN_BANDS;

// ── Types ──────────────────────────────────────────────────────────────────
export interface SimFormData {
  productName: string;
  sellingPrice: number;
  productCost: number;
  packagingCost: number;
  ifoodFeePercent: number;
  discount: number;
  adCost: number;
  otherCosts: number;
}

export interface ConditionalAlert {
  message: string;
  type: "warning" | "danger";
}

export interface PriceSuggestion {
  label: string;
  targetMargin: number;
  price: number;
}

export interface ScenarioComparison {
  profitDiff: number;
  marginDiff: number;
  priceDiff: number;
  improved: boolean;
  message: string;
}

export interface SimResult {
  // core
  sellingPrice: number;
  totalCost: number;
  ifoodFeeValue: number;
  profit: number;
  margin: number;
  cmv: number;
  classification: MarginClass;
  classLabel: string;

  // intelligence
  recommendation: string;
  suggestions: string[];
  alerts: ConditionalAlert[];
  priceSuggestions: PriceSuggestion[];

  // comparison (null on first run)
  comparison: ScenarioComparison | null;

  // meta
  productName: string;
  calculatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function classify(margin: number): MarginClass {
  if (margin < MARGIN_BANDS.loss.max) return "loss";
  if (margin < MARGIN_BANDS.critical.max) return "critical";
  if (margin < MARGIN_BANDS.tight.max) return "tight";
  if (margin < MARGIN_BANDS.ok.max) return "ok";
  return "healthy";
}

/** Round up to commercial endings (.90 or .99) */
function commercialRound(value: number): number {
  const base = Math.ceil(value);
  const mod = base % 1 === 0 ? base - 1 : Math.floor(value);
  const opt90 = mod + 0.9;
  const opt99 = mod + 0.99;
  // pick the smallest option that is >= value
  if (opt90 >= value) return opt90;
  if (opt99 >= value) return opt99;
  return base + 0.9; // next integer .90
}

// ── Core calculation ───────────────────────────────────────────────────────
export function calculate(
  form: SimFormData,
  previousResult: SimResult | null,
): SimResult {
  const {
    sellingPrice: price,
    productCost,
    packagingCost,
    ifoodFeePercent,
    discount,
    adCost,
    otherCosts,
    productName,
  } = form;

  const ifoodFeeValue = price * (ifoodFeePercent / 100);

  const totalCost =
    productCost +
    packagingCost +
    ifoodFeeValue +
    discount +
    adCost +
    otherCosts;

  const profit = price - totalCost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const cmv = price > 0 ? ((productCost + packagingCost) / price) * 100 : 0;

  const cls = classify(margin);

  // ── Recommendation & suggestions ──
  const { recommendation, suggestions } = getRecommendation(cls);

  // ── Conditional alerts ──
  const alerts = getAlerts(form, price, cmv);

  // ── Price suggestions for target margins ──
  const costWithoutIfood = productCost + packagingCost + discount + adCost + otherCosts;
  const priceSuggestions = getSuggestedPrices(costWithoutIfood, ifoodFeePercent);

  // ── Scenario comparison ──
  let comparison: ScenarioComparison | null = null;
  if (previousResult) {
    const profitDiff = profit - previousResult.profit;
    const marginDiff = margin - previousResult.margin;
    const priceDiff = price - previousResult.sellingPrice;
    const improved = profit > previousResult.profit;
    comparison = {
      profitDiff,
      marginDiff,
      priceDiff,
      improved,
      message: improved
        ? "O novo cenário melhora o lucro por venda."
        : profitDiff === 0
          ? "Cenários com resultado idêntico."
          : "O novo cenário reduz sua margem.",
    };
  }

  return {
    sellingPrice: price,
    totalCost,
    ifoodFeeValue,
    profit,
    margin,
    cmv,
    classification: cls,
    classLabel: MARGIN_BANDS[cls].label,
    recommendation,
    suggestions,
    alerts,
    priceSuggestions,
    comparison,
    productName: productName || "Produto sem nome",
    calculatedAt: new Date().toISOString(),
  };
}

// ── Recommendation logic ───────────────────────────────────────────────────
function getRecommendation(cls: MarginClass): { recommendation: string; suggestions: string[] } {
  switch (cls) {
    case "loss":
      return {
        recommendation: "Você pode estar pagando para vender esse item.",
        suggestions: [
          "Aumentar preço",
          "Revisar custo",
          "Reduzir desconto",
        ],
      };
    case "critical":
      return {
        recommendation: "Esse item está muito próximo do prejuízo.",
        suggestions: [
          "Subir preço levemente",
          "Revisar custos",
        ],
      };
    case "tight":
      return {
        recommendation: "O item ainda dá lucro, mas sobra pouco no final.",
        suggestions: [
          "Testar preço maior",
          "Usar em combo",
        ],
      };
    case "ok":
      return {
        recommendation: "A margem está equilibrada para operação.",
        suggestions: [
          "Avaliar promoção leve",
          "Monitorar custos",
        ],
      };
    case "healthy":
      return {
        recommendation: "Boa margem para operação.",
        suggestions: [
          "Usar em promoção controlada",
          "Destacar no cardápio",
        ],
      };
  }
}

// ── Conditional alerts ─────────────────────────────────────────────────────
function getAlerts(form: SimFormData, price: number, cmv: number): ConditionalAlert[] {
  const alerts: ConditionalAlert[] = [];
  if (price <= 0) return alerts;

  if (form.ifoodFeePercent > 25) {
    alerts.push({ message: `Taxa iFood de ${form.ifoodFeePercent.toFixed(1)}% está acima de 25%. Revise o plano com a plataforma.`, type: "danger" });
  }
  if (form.discount > price * 0.10) {
    alerts.push({ message: `Desconto acima de 10% do preço de venda (${((form.discount / price) * 100).toFixed(1)}%).`, type: "warning" });
  }
  if (form.packagingCost > price * 0.08) {
    alerts.push({ message: `Embalagem acima de 8% do preço (${((form.packagingCost / price) * 100).toFixed(1)}%).`, type: "warning" });
  }
  if (form.adCost > price * 0.06) {
    alerts.push({ message: `Custo de anúncio acima de 6% do preço (${((form.adCost / price) * 100).toFixed(1)}%).`, type: "warning" });
  }
  if (cmv > 40) {
    alerts.push({ message: `CMV de ${cmv.toFixed(1)}% está acima de 40%. Revise o custo dos insumos.`, type: "danger" });
  }

  return alerts;
}

// ── Suggested prices ───────────────────────────────────────────────────────
function getSuggestedPrices(costWithoutIfood: number, ifoodPercent: number): PriceSuggestion[] {
  const targets = [
    { label: "Preço mínimo", targetMargin: 0.10 },
    { label: "Preço recomendado", targetMargin: 0.15 },
    { label: "Preço saudável", targetMargin: 0.20 },
  ];

  return targets.map(({ label, targetMargin }) => {
    // price = costWithoutIfood / (1 - targetMargin - ifoodPercent/100)
    const denominator = 1 - targetMargin - ifoodPercent / 100;
    const rawPrice = denominator > 0 ? costWithoutIfood / denominator : 0;
    return {
      label,
      targetMargin: targetMargin * 100,
      price: rawPrice > 0 ? commercialRound(rawPrice) : 0,
    };
  });
}

// ── Local persistence ──────────────────────────────────────────────────────
const STORAGE_KEY = "precify_margin_last_sim";

export function saveLastSimulation(result: SimResult): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // silent fail on storage quota
  }
}

export function loadLastSimulation(): SimResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SimResult) : null;
  } catch {
    return null;
  }
}

export function clearLastSimulation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
