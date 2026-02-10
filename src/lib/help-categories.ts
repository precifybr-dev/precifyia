export const HELP_CATEGORIES = [
  { id: "primeiros_passos", label: "Primeiros Passos", icon: "Rocket" },
  { id: "precificacao_cmv", label: "Precificação e CMV", icon: "Calculator" },
  { id: "custos_despesas", label: "Custos e Despesas", icon: "Receipt" },
  { id: "ifood_taxas", label: "iFood e Taxas", icon: "Store" },
  { id: "lucro_margem", label: "Lucro e Margem", icon: "TrendingUp" },
  { id: "relatorios", label: "Relatórios", icon: "BarChart3" },
  { id: "conta_plano", label: "Conta e Plano", icon: "CreditCard" },
  { id: "problemas_comuns", label: "Problemas Comuns", icon: "AlertCircle" },
] as const;

export type HelpCategory = typeof HELP_CATEGORIES[number]["id"];

/**
 * Mapeamento de rotas do app para screen_id usado nas FAQs.
 */
export const SCREEN_MAP: Record<string, string> = {
  "/app": "dashboard",
  "/app/dashboard": "dashboard",
  "/app/business": "area_negocio",
  "/app/ingredients": "insumos",
  "/app/beverages": "bebidas",
  "/app/recipes": "fichas_tecnicas",
  "/app/sub-recipes": "sub_receitas",
  "/app/combos": "combos",
  "/app/recycle-bin": "lixeira",
};
