/**
 * Formata o código do insumo para exibição (ex: 1 -> #001)
 */
export function formatIngredientCode(code: number): string {
  return `#${code.toString().padStart(3, "0")}`;
}

/**
 * Extrai o código numérico de uma string formatada (ex: #001 -> 1, 001 -> 1)
 */
export function parseIngredientCode(input: string): number | null {
  const cleaned = input.replace(/[#\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Calcula o custo de um insumo baseado na quantidade usada
 * @param unitPrice Preço por unidade base (ex: R$/kg)
 * @param quantityUsed Quantidade usada
 * @param quantityUnit Unidade da quantidade usada (g, kg, ml, l, etc.)
 * @param baseUnit Unidade base do insumo (kg, l, un, etc.)
 */
export function calculateIngredientCost(
  unitPrice: number,
  quantityUsed: number,
  quantityUnit: string,
  baseUnit: string
): number {
  // Converter a quantidade usada para a unidade base
  const normalizedQuantity = convertToBaseUnit(quantityUsed, quantityUnit, baseUnit);
  return unitPrice * normalizedQuantity;
}

/**
 * Converte uma quantidade para a unidade base
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  // Se as unidades são iguais, retorna a quantidade original
  if (from === to) return quantity;

  // Conversões de peso
  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "mg" && to === "kg") return quantity / 1000000;
  if (from === "mg" && to === "g") return quantity / 1000;

  // Conversões de volume
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;

  // Se não há conversão conhecida, retorna a quantidade original
  return quantity;
}

/**
 * Retorna o multiplicador para converter para unidade base
 * Ex: g -> kg = 0.001
 */
export function getConversionMultiplier(fromUnit: string, toUnit: string): number {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  if (from === to) return 1;

  // Peso
  if (from === "g" && to === "kg") return 0.001;
  if (from === "kg" && to === "g") return 1000;
  
  // Volume
  if (from === "ml" && to === "l") return 0.001;
  if (from === "l" && to === "ml") return 1000;

  return 1;
}
