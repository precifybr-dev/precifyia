/**
 * Processador da planilha oficial de conciliação do iFood
 * Lê o arquivo Excel, agrupa por pedido e consolida métricas financeiras.
 */

export interface IfoodConsolidation {
  mesReferencia: string;
  totalPedidos: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  totalCupomLoja: number;
  totalCupomIfood: number;
  totalComissao: number;
  totalTaxa: number;
  totalAnuncios: number;
  ticketMedio: number;
  percentualMedioComissao: number;
  percentualMedioTaxa: number;
  percentualRealIfood: number;
  // Derived for plan auto-fill
  couponAbsorber: "business" | "ifood" | "partial";
  couponType: "fixed" | "percent";
  couponAvgValue: number;
  ordersWithCoupon: number;
  // Coupon breakdown
  ordersWithCouponLojaOnly: number;
  ordersWithCouponIfoodOnly: number;
  ordersWithCouponShared: number;
  ordersWithoutCoupon: number;
  totalCupomShared: number;
  // Delivery breakdown
  ordersWithIfoodDelivery: number;
  totalDeliveryCost: number;
}

const REQUIRED_COLUMNS = [
  "competencia",
  "tipo_lancamento",
  "descricao_lancamento",
  "valor",
  "base_calculo",
  "percentual_taxa",
  "pedido_associado_ifood_curto",
] as const;

// Normalize header: lowercase, remove accents, replace spaces/special chars with underscore
function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_$/g, "");
}

// Parse Brazilian currency string "R$ 1.234,56" or "-1.234,56" to number
function parseBRValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (raw == null) return 0;
  const str = String(raw).replace(/R\$\s*/g, "").replace(/\s/g, "");
  // Remove thousand separators (dots) and convert comma to dot
  const normalized = str.replace(/\./g, "").replace(",", ".");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}

// Parse percentage "3,2%" -> 3.2
// Excel stores percentages as decimals (0.12 = 12%), so detect and convert
function parseBRPercent(raw: unknown): number {
  if (typeof raw === "number") {
    // Excel stores 12% as 0.12 — if value is between -1 and 1 (exclusive), multiply by 100
    if (raw !== 0 && Math.abs(raw) < 1) {
      return raw * 100;
    }
    return raw;
  }
  if (raw == null) return 0;
  const str = String(raw).replace("%", "").replace(",", ".").trim();
  const val = parseFloat(str);
  if (isNaN(val)) return 0;
  // Also handle string-formatted decimals from Excel like "0.12"
  if (val !== 0 && Math.abs(val) < 1 && !String(raw).includes("%")) {
    return val * 100;
  }
  return val;
}

export function processIfoodSpreadsheet(rows: Record<string, unknown>[]): IfoodConsolidation {
  if (!rows || rows.length === 0) {
    throw new Error("Planilha vazia. Nenhuma linha encontrada.");
  }

  // Normalize all column keys
  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  });

  // Validate required columns exist
  const sampleKeys = Object.keys(normalizedRows[0]);
  const missing = REQUIRED_COLUMNS.filter(
    (col) => !sampleKeys.some((k) => k.includes(col))
  );
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias não encontradas: ${missing.join(", ")}. Verifique se é a planilha de conciliação do iFood.`
    );
  }

  // Helper: find the actual key that contains the target column name
  const findKey = (row: Record<string, unknown>, target: string): string => {
    return Object.keys(row).find((k) => k.includes(target)) || target;
  };

  // Extract reference month from first row
  const firstRow = normalizedRows[0];
  const compKey = findKey(firstRow, "competencia");
  const rawComp = String(firstRow[compKey] || "");
  // Try to parse "MM/YYYY" or "YYYY-MM" format
  let mesReferencia = "";
  const matchSlash = rawComp.match(/(\d{2})\/(\d{4})/);
  const matchDash = rawComp.match(/(\d{4})-(\d{2})/);
  if (matchSlash) {
    mesReferencia = `${matchSlash[2]}-${matchSlash[1]}`;
  } else if (matchDash) {
    mesReferencia = `${matchDash[1]}-${matchDash[2]}`;
  } else {
    // Fallback: current month
    const now = new Date();
    mesReferencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  // Separate lines WITH and WITHOUT order ID
  const orderKey = findKey(firstRow, "pedido_associado_ifood_curto");
  const tipoKey = findKey(firstRow, "tipo_lancamento");
  const descKey = findKey(firstRow, "descricao_lancamento");
  const valorKey = findKey(firstRow, "valor");
  const baseKey = findKey(firstRow, "base_calculo");
  const percKey = findKey(firstRow, "percentual_taxa");

  const orderLines: Record<string, unknown>[] = [];
  const adLines: Record<string, unknown>[] = [];

  for (const row of normalizedRows) {
    const orderId = String(row[orderKey] || "").trim();
    const desc = String(row[descKey] || "").toLowerCase();
    
    if (!orderId || orderId === "" || orderId === "undefined" || orderId === "null") {
      // Lines without order = ads or other non-order charges
      adLines.push(row);
    } else {
      orderLines.push(row);
    }
  }

  // Group order lines by order ID
  const orderGroups = new Map<string, Record<string, unknown>[]>();
  for (const row of orderLines) {
    const orderId = String(row[orderKey]).trim();
    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, []);
    }
    orderGroups.get(orderId)!.push(row);
  }

  // Process each order — one entry per unique order ID
  let faturamentoBruto = 0;
  let faturamentoLiquido = 0;
  let totalCupomLoja = 0;
  let totalCupomIfood = 0;
  let totalComissao = 0;
  let totalTaxa = 0;
  let ordersWithCoupon = 0;
  let ordersWithCouponLojaOnly = 0;
  let ordersWithCouponIfoodOnly = 0;
  let ordersWithCouponShared = 0;
  let totalCupomShared = 0;
  let ordersWithIfoodDelivery = 0;
  let totalDeliveryCost = 0;

  const comissaoPercentages: number[] = [];
  const taxaPercentages: number[] = [];

  for (const [, lines] of orderGroups) {
    // Per-order accumulators — reset for each unique order
    let orderGross = 0;       // gross revenue for THIS order
    let orderNet = 0;
    let orderCupomLoja = 0;
    let orderCupomIfood = 0;
    let orderComissao = 0;
    let orderTaxa = 0;
    let orderHasIfoodDelivery = false;
    let orderDeliveryCost = 0;

    for (const line of lines) {
      const tipo = String(line[tipoKey] || "").toLowerCase();
      const desc = String(line[descKey] || "").toLowerCase();
      const valor = parseBRValue(line[valorKey]);
      const base = parseBRValue(line[baseKey]);
      const perc = parseBRPercent(line[percKey]);

      // Classify each line within the SAME order
      if (desc.includes("entrada financeira") || desc.includes("repasse") || tipo.includes("credito") || tipo.includes("crédito")) {
        // Use base_calculo when available (it's the original order value before deductions)
        if (base > 0) {
          orderGross = Math.max(orderGross, base); // take highest base — same order
        } else {
          orderGross += Math.abs(valor);
        }
        orderNet += valor;
      } else if (desc.includes("promo") && (desc.includes("loja") || desc.includes("restaurante") || desc.includes("merchant"))) {
        orderCupomLoja += Math.abs(valor);
        orderNet += valor;
      } else if (desc.includes("promo") && desc.includes("ifood")) {
        orderCupomIfood += Math.abs(valor);
        orderNet += valor;
      } else if (desc.includes("comiss") || desc.includes("commission")) {
        orderComissao += Math.abs(valor);
        orderNet += valor;
        if (perc > 0) comissaoPercentages.push(perc);
      } else if (desc.includes("taxa") && (desc.includes("transa") || desc.includes("pagamento"))) {
        orderTaxa += Math.abs(valor);
        orderNet += valor;
        if (perc > 0) taxaPercentages.push(perc);
      } else if (desc.includes("entrega") && desc.includes("ifood")) {
        orderHasIfoodDelivery = true;
        orderDeliveryCost += Math.abs(valor);
        orderNet += valor;
      } else {
        orderNet += valor;
      }
    }

    // Accumulate consolidated order into globals
    faturamentoBruto += orderGross;
    faturamentoLiquido += orderNet;
    totalCupomLoja += orderCupomLoja;
    totalCupomIfood += orderCupomIfood;
    totalComissao += orderComissao;
    totalTaxa += orderTaxa;

    // Coupon classification — per consolidated order
    const hasLoja = orderCupomLoja > 0;
    const hasIfood = orderCupomIfood > 0;
    if (hasLoja || hasIfood) {
      ordersWithCoupon++;
      if (hasLoja && hasIfood) {
        ordersWithCouponShared++;
        totalCupomShared += orderCupomLoja + orderCupomIfood;
      } else if (hasLoja) {
        ordersWithCouponLojaOnly++;
      } else {
        ordersWithCouponIfoodOnly++;
      }
    }

    if (orderHasIfoodDelivery) {
      ordersWithIfoodDelivery++;
      totalDeliveryCost += orderDeliveryCost;
    }
  }

  // Fallback: if no base_calculo was found, estimate gross from credit lines
  if (faturamentoBruto === 0) {
    for (const row of orderLines) {
      const desc = String(row[descKey] || "").toLowerCase();
      const valor = parseBRValue(row[valorKey]);
      if ((desc.includes("entrada") || desc.includes("repasse")) && valor > 0) {
        faturamentoBruto += valor;
      }
    }
  }

  // Process ads
  let totalAnuncios = 0;
  for (const line of adLines) {
    const desc = String(line[descKey] || "").toLowerCase();
    const valor = parseBRValue(line[valorKey]);
    if (desc.includes("anuncio") || desc.includes("anúncio") || desc.includes("pacote") || desc.includes("ads") || desc.includes("publicidade")) {
      totalAnuncios += Math.abs(valor);
    }
  }

  const totalPedidos = orderGroups.size;
  const ticketMedio = totalPedidos > 0 ? faturamentoBruto / totalPedidos : 0;

  const percentualMedioComissao =
    comissaoPercentages.length > 0
      ? comissaoPercentages.reduce((a, b) => a + b, 0) / comissaoPercentages.length
      : 0;

  const percentualMedioTaxa =
    taxaPercentages.length > 0
      ? taxaPercentages.reduce((a, b) => a + b, 0) / taxaPercentages.length
      : 0;

  const percentualRealIfood =
    faturamentoBruto > 0
      ? ((totalComissao + totalTaxa) / faturamentoBruto) * 100
      : 0;

  // Determine coupon absorber
  let couponAbsorber: "business" | "ifood" | "partial" = "business";
  if (totalCupomLoja > 0 && totalCupomIfood > 0) {
    couponAbsorber = "partial";
  } else if (totalCupomIfood > 0 && totalCupomLoja === 0) {
    couponAbsorber = "ifood";
  }

  const totalCouponValue = totalCupomLoja + totalCupomIfood;
  const couponAvgValue = ordersWithCoupon > 0 ? totalCouponValue / ordersWithCoupon : 0;

  const ordersWithoutCoupon = totalPedidos - ordersWithCoupon;

  return {
    mesReferencia,
    totalPedidos,
    faturamentoBruto: round2(faturamentoBruto),
    faturamentoLiquido: round2(faturamentoLiquido),
    totalCupomLoja: round2(totalCupomLoja),
    totalCupomIfood: round2(totalCupomIfood),
    totalComissao: round2(totalComissao),
    totalTaxa: round2(totalTaxa),
    totalAnuncios: round2(totalAnuncios),
    ticketMedio: round2(ticketMedio),
    percentualMedioComissao: round2(percentualMedioComissao),
    percentualMedioTaxa: round2(percentualMedioTaxa),
    percentualRealIfood: round2(percentualRealIfood),
    couponAbsorber,
    couponType: "fixed",
    couponAvgValue: round2(couponAvgValue),
    ordersWithCoupon,
    ordersWithCouponLojaOnly,
    ordersWithCouponIfoodOnly,
    ordersWithCouponShared,
    ordersWithoutCoupon,
    totalCupomShared: round2(totalCupomShared),
    ordersWithIfoodDelivery,
    totalDeliveryCost: round2(totalDeliveryCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
