/**
 * Processador da planilha oficial de conciliação do iFood
 * Lê o arquivo Excel, agrupa por pedido e consolida métricas financeiras.
 *
 * REGRAS DE OURO:
 * - Faturamento Bruto = soma do valor da VENDA por pedido único (não base_calculo)
 * - Cupons = SOMENTE "Promoção custeada pela loja" e "Promoção custeada pelo iFood"
 * - Percentual Real = (Comissão + Taxa Transação + Entrega iFood) / Faturamento Bruto
 * - Dashboard bloqueado se validações críticas falharem
 */

export interface ValidationWarning {
  level: "error" | "warning";
  message: string;
}

export interface IfoodDebugInfo {
  totalLinhasRaw: number;
  totalLinhasComPedido: number;
  totalPedidosUnicos: number;
  somaBaseCalculo: number;
  somaEntradaFinanceira: number;
  somaCupomLoja: number;
  somaCupomIfood: number;
  faturamentoBrutoFinal: number;
}

export interface IfoodConsolidation {
  mesReferencia: string;
  totalPedidos: number;
  totalLinhas: number;
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
  // Validation
  warnings: ValidationWarning[];
  // Debug info (for transparency)
  debugInfo?: IfoodDebugInfo;
  // Whether dashboard should be blocked
  isBlocked?: boolean;
}

const REQUIRED_COLUMNS = [
  "competencia",
  "tipo_lancamento",
  "descricao_lancamento",
  "valor",
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
  const normalized = str.replace(/\./g, "").replace(",", ".");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}

// Parse percentage "3,2%" -> 3.2
function parseBRPercent(raw: unknown): number {
  if (typeof raw === "number") {
    if (raw !== 0 && Math.abs(raw) < 1) {
      return raw * 100;
    }
    return raw;
  }
  if (raw == null) return 0;
  const str = String(raw).replace("%", "").replace(",", ".").trim();
  const val = parseFloat(str);
  if (isNaN(val)) return 0;
  if (val !== 0 && Math.abs(val) < 1 && !String(raw).includes("%")) {
    return val * 100;
  }
  return val;
}

// Helper: find the actual key that contains the target column name
function findKey(row: Record<string, unknown>, target: string): string {
  return Object.keys(row).find((k) => k.includes(target)) || target;
}

/**
 * Classify a line's description into a semantic category.
 * This is the SINGLE source of truth for classification.
 */
type LineCategory =
  | "venda"
  | "comissao"
  | "taxa_transacao"
  | "cupom_loja"
  | "cupom_ifood"
  | "entrega_ifood"
  | "anuncio"
  | "outro";

function classifyLine(desc: string): LineCategory {
  const d = desc.toLowerCase();

  // CUPONS — strict match: only "promoção custeada"
  if (d.includes("promo") && (d.includes("custeada") || d.includes("custeado"))) {
    if (d.includes("loja") || d.includes("restaurante") || d.includes("merchant") || d.includes("parceiro")) {
      return "cupom_loja";
    }
    if (d.includes("ifood")) {
      return "cupom_ifood";
    }
  }
  // Also catch "promoção" with loja/ifood for less strict formats
  if (d.includes("promo")) {
    if (d.includes("loja") || d.includes("restaurante") || d.includes("merchant") || d.includes("parceiro")) {
      return "cupom_loja";
    }
    if (d.includes("ifood")) {
      return "cupom_ifood";
    }
  }

  // COMISSÃO
  if (d.includes("comiss") || d.includes("commission")) {
    return "comissao";
  }

  // TAXA DE TRANSAÇÃO / PAGAMENTO
  if (d.includes("taxa") && (d.includes("transa") || d.includes("pagamento"))) {
    return "taxa_transacao";
  }

  // ENTREGA IFOOD
  if (d.includes("entrega") && d.includes("ifood")) {
    return "entrega_ifood";
  }

  // VENDA / REPASSE / ENTRADA FINANCEIRA (the actual sale value)
  if (d.includes("entrada financeira") || d.includes("repasse") || d.includes("venda")) {
    return "venda";
  }

  // ANÚNCIOS (lines without order ID)
  if (d.includes("anuncio") || d.includes("anúncio") || d.includes("ads") || d.includes("publicidade") || d.includes("pacote")) {
    return "anuncio";
  }

  return "outro";
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

  // Extract reference month from first row
  const firstRow = normalizedRows[0];
  const compKey = findKey(firstRow, "competencia");
  const rawComp = String(firstRow[compKey] || "");
  let mesReferencia = "";
  const matchSlash = rawComp.match(/(\d{2})\/(\d{4})/);
  const matchDash = rawComp.match(/(\d{4})-(\d{2})/);
  if (matchSlash) {
    mesReferencia = `${matchSlash[2]}-${matchSlash[1]}`;
  } else if (matchDash) {
    mesReferencia = `${matchDash[1]}-${matchDash[2]}`;
  } else {
    const now = new Date();
    mesReferencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const orderKey = findKey(firstRow, "pedido_associado_ifood_curto");
  const descKey = findKey(firstRow, "descricao_lancamento");
  const valorKey = findKey(firstRow, "valor");
  const percKey = findKey(firstRow, "percentual_taxa");

  // Separate lines WITH and WITHOUT order ID
  const orderLines: Record<string, unknown>[] = [];
  const noOrderLines: Record<string, unknown>[] = [];

  for (const row of normalizedRows) {
    const orderId = String(row[orderKey] || "").trim();
    if (!orderId || orderId === "" || orderId === "undefined" || orderId === "null") {
      noOrderLines.push(row);
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

  // Debug accumulators
  let debugSomaBaseCalculo = 0;
  let debugSomaEntradaFinanceira = 0;
  let debugSomaCupomLoja = 0;
  let debugSomaCupomIfood = 0;

  // Global accumulators
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

  // Process each order group
  for (const [, lines] of orderGroups) {
    let orderSaleValue = 0;
    let orderNetAccum = 0;
    let orderCupomLoja = 0;
    let orderCupomIfood = 0;
    let orderComissao = 0;
    let orderTaxa = 0;
    let orderHasIfoodDelivery = false;
    let orderDeliveryCost = 0;

    for (const line of lines) {
      const desc = String(line[descKey] || "");
      const valor = parseBRValue(line[valorKey]);
      const perc = percKey ? parseBRPercent(line[findKey(line, "percentual_taxa")]) : 0;
      const baseCalc = parseBRValue(line[findKey(line, "base_calculo")]);
      const category = classifyLine(desc);

      // Debug accumulation
      if (baseCalc > 0) debugSomaBaseCalculo += baseCalc;

      switch (category) {
        case "venda":
          // The sale value for this order — take the positive valor
          // This represents what the customer paid (gross sale)
          debugSomaEntradaFinanceira += Math.abs(valor);
          orderSaleValue += Math.abs(valor);
          orderNetAccum += valor;
          break;

        case "cupom_loja":
          debugSomaCupomLoja += Math.abs(valor);
          orderCupomLoja += Math.abs(valor);
          orderNetAccum += valor; // negative value reduces net
          break;

        case "cupom_ifood":
          debugSomaCupomIfood += Math.abs(valor);
          orderCupomIfood += Math.abs(valor);
          orderNetAccum += valor;
          break;

        case "comissao":
          orderComissao += Math.abs(valor);
          orderNetAccum += valor;
          if (perc > 0) comissaoPercentages.push(perc);
          break;

        case "taxa_transacao":
          orderTaxa += Math.abs(valor);
          orderNetAccum += valor;
          if (perc > 0) taxaPercentages.push(perc);
          break;

        case "entrega_ifood":
          orderHasIfoodDelivery = true;
          orderDeliveryCost += Math.abs(valor);
          orderNetAccum += valor;
          break;

        default:
          // "outro" — still accumulate into net
          orderNetAccum += valor;
          break;
      }
    }

    // Accumulate into globals
    faturamentoBruto += orderSaleValue;
    faturamentoLiquido += orderNetAccum;
    totalCupomLoja += orderCupomLoja;
    totalCupomIfood += orderCupomIfood;
    totalComissao += orderComissao;
    totalTaxa += orderTaxa;

    // Coupon classification per order
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

  // Process ads from lines without order ID
  let totalAnuncios = 0;
  for (const line of noOrderLines) {
    const desc = String(line[descKey] || "");
    const valor = parseBRValue(line[valorKey]);
    if (classifyLine(desc) === "anuncio") {
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

  // Percentual Real = (Comissão + Taxa + Entrega iFood) / Bruto
  const percentualRealIfood =
    faturamentoBruto > 0
      ? ((totalComissao + totalTaxa + totalDeliveryCost) / faturamentoBruto) * 100
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
  const totalLinhas = orderLines.length;

  const debugInfo: IfoodDebugInfo = {
    totalLinhasRaw: normalizedRows.length,
    totalLinhasComPedido: orderLines.length,
    totalPedidosUnicos: totalPedidos,
    somaBaseCalculo: round2(debugSomaBaseCalculo),
    somaEntradaFinanceira: round2(debugSomaEntradaFinanceira),
    somaCupomLoja: round2(debugSomaCupomLoja),
    somaCupomIfood: round2(debugSomaCupomIfood),
    faturamentoBrutoFinal: round2(faturamentoBruto),
  };

  const result: IfoodConsolidation = {
    mesReferencia,
    totalPedidos,
    totalLinhas,
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
    couponType: "fixed" as const,
    couponAvgValue: round2(couponAvgValue),
    ordersWithCoupon,
    ordersWithCouponLojaOnly,
    ordersWithCouponIfoodOnly,
    ordersWithCouponShared,
    ordersWithoutCoupon,
    totalCupomShared: round2(totalCupomShared),
    ordersWithIfoodDelivery,
    totalDeliveryCost: round2(totalDeliveryCost),
    warnings: [],
    debugInfo,
    isBlocked: false,
  };

  const { warnings, isBlocked } = validateConsolidation(result);
  result.warnings = warnings;
  result.isBlocked = isBlocked;

  // Console debug (always, for transparency)
  console.log("[iFood Processor] Debug:", debugInfo);
  console.log("[iFood Processor] Warnings:", warnings);
  if (isBlocked) {
    console.warn("[iFood Processor] BLOCKED — dados inconsistentes detectados.");
  }

  return result;
}

function validateConsolidation(data: IfoodConsolidation): { warnings: ValidationWarning[]; isBlocked: boolean } {
  const warnings: ValidationWarning[] = [];
  let isBlocked = false;
  const totalCupons = data.totalCupomLoja + data.totalCupomIfood + data.totalCupomShared;

  // BLOQUEANTE: Pedidos == Linhas (não houve agrupamento)
  if (data.totalLinhas > 0 && data.totalPedidos === data.totalLinhas && data.totalPedidos > 1) {
    warnings.push({
      level: "error",
      message: `Número de pedidos (${data.totalPedidos}) é igual ao número de linhas (${data.totalLinhas}). Não houve agrupamento por ID do pedido.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: Cupons > Bruto
  if (data.faturamentoBruto > 0 && totalCupons > data.faturamentoBruto) {
    warnings.push({
      level: "error",
      message: `Total de cupons (${fmt(totalCupons)}) é maior que o faturamento bruto (${fmt(data.faturamentoBruto)}). Dados inconsistentes.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: Bruto = 0 mas tem pedidos
  if (data.totalPedidos > 0 && data.faturamentoBruto <= 0) {
    warnings.push({
      level: "error",
      message: `Faturamento bruto é zero mas existem ${data.totalPedidos} pedidos. Possível erro na classificação das linhas.`,
    });
    isBlocked = true;
  }

  // WARNING: Cupom > 40% do bruto
  if (data.faturamentoBruto > 0 && totalCupons > data.faturamentoBruto * 0.4 && totalCupons <= data.faturamentoBruto) {
    warnings.push({
      level: "warning",
      message: `Total de cupons (${fmt(totalCupons)}) ultrapassa 40% do faturamento bruto (${fmt(data.faturamentoBruto)}). Verifique se está correto.`,
    });
  }

  // BLOQUEANTE: Percentual real > 50%
  if (data.percentualRealIfood > 50) {
    warnings.push({
      level: "error",
      message: `Percentual pago ao iFood (${data.percentualRealIfood.toFixed(1)}%) é superior a 50%. Provável erro de consolidação.`,
    });
    isBlocked = true;
  }

  // WARNING: Ticket médio alto
  if (data.ticketMedio > 500) {
    warnings.push({
      level: "warning",
      message: `Ticket médio (${fmt(data.ticketMedio)}) está acima de R$ 500. Verifique se o agrupamento está correto.`,
    });
  }

  // WARNING: Reconciliação básica
  if (data.faturamentoBruto > 0) {
    const expected = data.faturamentoBruto - data.totalComissao - data.totalTaxa - data.totalCupomLoja;
    const diff = Math.abs(expected - data.faturamentoLiquido);
    const margin = data.faturamentoBruto * 0.05;
    if (diff > margin) {
      warnings.push({
        level: "warning",
        message: `Reconciliação: diferença de ${fmt(diff)} entre valor esperado e líquido real (margem de 5%: ${fmt(margin)}).`,
      });
    }
  }

  return { warnings, isBlocked };
}

function fmt(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
