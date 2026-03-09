/**
 * Dr. Margem — Rule-based recommendation engine
 * Analyzes recipe/pricing data and generates actionable recommendations.
 */

export type DrMargemPriority = "alta" | "media" | "baixa";

export type DrMargemType =
  | "prejuizo"
  | "margem_critica"
  | "margem_apertada"
  | "cmv_alto"
  | "taxa_ifood_alta"
  | "margem_saudavel";

export interface DrMargemRecommendation {
  advisor: "Dr. Margem";
  priority: DrMargemPriority;
  type: DrMargemType;
  title: string;
  message: string;
  actions: string[];
  productName?: string;
  /** Optional: suggestion like "Se subir R$2, margem sobe de X% para Y%" */
  priceSuggestion?: string;
}

export interface DrMargemResult {
  recommendations: DrMargemRecommendation[];
  hasMore: boolean;
  totalCount: number;
}

export interface RecipeInput {
  name: string;
  total_cost: number;
  selling_price: number | null;
  cost_per_serving: number;
  ifood_selling_price?: number | null;
  cmv_target?: number | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function analyzeRecipe(recipe: RecipeInput): DrMargemRecommendation | null {
  const price = recipe.selling_price || 0;
  const cost = recipe.cost_per_serving || recipe.total_cost || 0;

  if (price <= 0 || cost <= 0) return null;

  const profit = price - cost;
  const margin = (profit / price) * 100;
  const cmv = (cost / price) * 100;

  // Loss
  if (profit < 0) {
    const increase = Math.ceil((cost * 1.1 - price) * 100) / 100;
    return {
      advisor: "Dr. Margem",
      priority: "alta",
      type: "prejuizo",
      title: `${recipe.name} está dando prejuízo`,
      message: "Você pode estar pagando para vender esse produto.",
      actions: [
        `Aumentar preço em ${formatCurrency(Math.max(increase, 1))}`,
        "Revisar custo do produto",
        "Reduzir desconto ou promoção",
        "Considerar retirar do cardápio",
      ],
      productName: recipe.name,
      priceSuggestion: `Para sair do prejuízo, o preço mínimo seria ${formatCurrency(cost * 1.1)}.`,
    };
  }

  // Critical margin < 5%
  if (margin < 5) {
    const targetPrice = cost / (1 - 0.15);
    const diff = targetPrice - price;
    return {
      advisor: "Dr. Margem",
      priority: "alta",
      type: "margem_critica",
      title: `${recipe.name} com margem crítica`,
      message: "Esse produto está muito perto do prejuízo.",
      actions: [
        "Subir preço levemente",
        "Revisar custo dos insumos",
        "Revisar embalagem",
      ],
      productName: recipe.name,
      priceSuggestion: diff > 0
        ? `Se subir ${formatCurrency(diff)}, a margem sobe de ${margin.toFixed(0)}% para 15%.`
        : undefined,
    };
  }

  // CMV > 40%
  if (cmv > 40) {
    return {
      advisor: "Dr. Margem",
      priority: "media",
      type: "cmv_alto",
      title: `CMV alto no ${recipe.name}`,
      message: "O custo base deste produto está alto.",
      actions: [
        "Revisar gramatura dos insumos",
        "Negociar com fornecedor",
        "Revisar receita",
      ],
      productName: recipe.name,
    };
  }

  // Tight margin 5-12%
  if (margin < 12) {
    const increase = 2;
    const newMargin = ((price + increase - cost) / (price + increase)) * 100;
    return {
      advisor: "Dr. Margem",
      priority: "media",
      type: "margem_apertada",
      title: `${recipe.name} com margem apertada`,
      message: "Esse produto vende, mas sobra pouco no final.",
      actions: [
        "Testar aumento de preço",
        "Usar em combo",
        "Evitar descontos agressivos",
      ],
      productName: recipe.name,
      priceSuggestion: `Se subir ${formatCurrency(increase)}, a margem sobe de ${margin.toFixed(0)}% para ${newMargin.toFixed(0)}%.`,
    };
  }

  // Healthy margin >= 20%
  if (margin >= 20) {
    return {
      advisor: "Dr. Margem",
      priority: "baixa",
      type: "margem_saudavel",
      title: `${recipe.name} com boa margem`,
      message: "Esse produto tem margem saudável para operação.",
      actions: [
        "Destacar no cardápio",
        "Usar em campanha promocional",
        "Criar combo com ele",
      ],
      productName: recipe.name,
    };
  }

  return null;
}

const priorityOrder: Record<DrMargemPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

/**
 * Generate recommendations from an array of recipes.
 * Returns top 3 by priority with a flag if there are more.
 */
export function generateRecommendations(
  recipes: RecipeInput[],
  maxVisible = 3,
): DrMargemResult {
  const all: DrMargemRecommendation[] = [];

  for (const recipe of recipes) {
    const rec = analyzeRecipe(recipe);
    if (rec) all.push(rec);
  }

  // Sort by priority
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    recommendations: all.slice(0, maxVisible),
    hasMore: all.length > maxVisible,
    totalCount: all.length,
  };
}

/**
 * Generate a single recommendation for a simulated product.
 */
export function generateSingleRecommendation(
  input: RecipeInput,
): DrMargemRecommendation | null {
  return analyzeRecipe(input);
}
