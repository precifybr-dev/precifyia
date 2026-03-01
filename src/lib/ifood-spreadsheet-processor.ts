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
  somaMaxValorCesta: number;
  somaMaxBaseCalculo: number;
  somaEntradaFinanceira: number;
  somaCupomLoja: number;
  somaCupomIfood: number;
  somaComissao: number;
  somaTaxaTransacao: number;
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
  "descricao_lancamento",
  "valor",
  "pedido_associado_ifood_curto",
  "valor_cesta_final",
] as const;

const COUPON_LOJA_DESCRIPTIONS = new Set([
  "promocao custeada pela loja",
  "promocao custeada pela loja no delivery",
]);

const COUPON_IFOOD_DESCRIPTIONS = new Set(["promocao custeada pelo ifood"]);

const COMMISSION_DESCRIPTIONS = new Set([
  "comissao do ifood (entrega propria da loja)",
  "comissao do ifood (entrega ifood)",
  "comissao do ifood",
]);

const TRANSACTION_FEE_DESCRIPTIONS = new Set([
  "taxa de transacao",
  "taxa de transacao ifood beneficios",
  "reembolso taxa de transacao ifood beneficios",
  "mensalidade",
]);

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

function normalizeDescription(raw: unknown): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOrderId(raw: unknown): string {
  const base = String(raw || "").trim().replace(/\.0+$/, "");
  const onlyDigits = base.replace(/\D/g, "");
  return onlyDigits;
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

function classifyLine(desc: unknown): LineCategory {
  const d = normalizeDescription(desc);

  if (COUPON_LOJA_DESCRIPTIONS.has(d)) return "cupom_loja";
  if (COUPON_IFOOD_DESCRIPTIONS.has(d)) return "cupom_ifood";
  if (COMMISSION_DESCRIPTIONS.has(d)) return "comissao";
  if (TRANSACTION_FEE_DESCRIPTIONS.has(d)) return "taxa_transacao";

  if (d.includes("entrega") && d.includes("ifood")) return "entrega_ifood";
  if (d.includes("entrada financeira") || d.includes("repasse") || d.includes("venda")) return "venda";
  if (d.includes("anuncio") || d.includes("ads") || d.includes("publicidade") || d.includes("pacote")) return "anuncio";

  return "outro";
}

export function processIfoodSpreadsheet(rows: Record<string, unknown>[]): IfoodConsolidation {
  if (!rows || rows.length === 0) {
    throw new Error("Planilha vazia. Nenhuma linha encontrada.");
  }

  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  });

  const sampleKeys = Object.keys(normalizedRows[0]);
  const missing = REQUIRED_COLUMNS.filter((col) => !sampleKeys.some((k) => k.includes(col)));
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias não encontradas: ${missing.join(", ")}. Verifique se é a planilha de conciliação do iFood.`
    );
  }

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
  const valorCestaKey = findKey(firstRow, "valor_cesta_final");
  const baseCalcKey = findKey(firstRow, "base_calculo");

  const orderLines: Array<{ orderId: string; row: Record<string, unknown> }> = [];
  const noOrderLines: Record<string, unknown>[] = [];

  for (const row of normalizedRows) {
    const orderId = normalizeOrderId(row[orderKey]);
    if (!orderId) {
      noOrderLines.push(row);
      continue;
    }
    orderLines.push({ orderId, row });
  }

  const orderGroups = new Map<string, Record<string, unknown>[]>();
  for (const item of orderLines) {
    if (!orderGroups.has(item.orderId)) {
      orderGroups.set(item.orderId, []);
    }
    orderGroups.get(item.orderId)!.push(item.row);
  }

  let debugSomaMaxValorCesta = 0;
  let debugSomaMaxBaseCalculo = 0;
  let debugSomaEntradaFinanceira = 0;
  let debugSomaCupomLoja = 0;
  let debugSomaCupomIfood = 0;

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
    let orderNetAccum = 0;
    let orderCupomLojaSigned = 0;
    let orderCupomIfoodSigned = 0;
    let orderComissaoSigned = 0;
    let orderTaxaSigned = 0;
    let orderDeliverySigned = 0;
    let orderMaxValorCesta = 0;
    let orderMaxBaseCalculo = 0;

    for (const line of lines) {
      const valor = parseBRValue(line[valorKey]);
      const perc = parseBRPercent(line[percKey]);
      const valorCesta = parseBRValue(line[valorCestaKey]);
      const baseCalc = parseBRValue(line[baseCalcKey]);
      const category = classifyLine(line[descKey]);

      if (valorCesta > orderMaxValorCesta) orderMaxValorCesta = valorCesta;
      if (baseCalc > orderMaxBaseCalculo) orderMaxBaseCalculo = baseCalc;

      switch (category) {
        case "venda":
          debugSomaEntradaFinanceira += Math.abs(valor);
          orderNetAccum += valor;
          break;

        case "cupom_loja":
          orderCupomLojaSigned += valor;
          orderNetAccum += valor;
          break;

        case "cupom_ifood":
          orderCupomIfoodSigned += valor;
          orderNetAccum += valor;
          break;

        case "comissao":
          orderComissaoSigned += valor;
          orderNetAccum += valor;
          if (perc > 0) comissaoPercentages.push(perc);
          break;

        case "taxa_transacao":
          orderTaxaSigned += valor;
          orderNetAccum += valor;
          if (perc > 0) taxaPercentages.push(perc);
          break;

        case "entrega_ifood":
          orderDeliverySigned += valor;
          orderNetAccum += valor;
          break;

        default:
          orderNetAccum += valor;
          break;
      }
    }

    const orderCupomLoja = Math.abs(orderCupomLojaSigned);
    const orderCupomIfood = Math.abs(orderCupomIfoodSigned);
    const orderComissao = Math.abs(orderComissaoSigned);
    const orderTaxa = Math.abs(orderTaxaSigned);
    const orderDelivery = Math.abs(orderDeliverySigned);

    debugSomaMaxValorCesta += orderMaxValorCesta;
    debugSomaMaxBaseCalculo += orderMaxBaseCalculo;
    debugSomaCupomLoja += orderCupomLoja;
    debugSomaCupomIfood += orderCupomIfood;

    faturamentoBruto += orderMaxValorCesta;
    faturamentoLiquido += orderNetAccum;
    totalCupomLoja += orderCupomLoja;
    totalCupomIfood += orderCupomIfood;
    totalComissao += orderComissao;
    totalTaxa += orderTaxa;

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

    if (orderDelivery > 0) {
      ordersWithIfoodDelivery++;
      totalDeliveryCost += orderDelivery;
    }
  }

  let totalAnuncios = 0;
  for (const line of noOrderLines) {
    const valor = parseBRValue(line[valorKey]);
    if (classifyLine(line[descKey]) === "anuncio") {
      totalAnuncios += Math.abs(valor);
    }
  }

  const totalPedidos = orderGroups.size;
  const totalLinhas = orderLines.length;
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
      ? ((totalComissao + totalTaxa + totalDeliveryCost) / faturamentoBruto) * 100
      : 0;

  let couponAbsorber: "business" | "ifood" | "partial" = "business";
  if (totalCupomLoja > 0 && totalCupomIfood > 0) {
    couponAbsorber = "partial";
  } else if (totalCupomIfood > 0 && totalCupomLoja === 0) {
    couponAbsorber = "ifood";
  }

  const totalCouponValue = totalCupomLoja + totalCupomIfood;
  const couponAvgValue = ordersWithCoupon > 0 ? totalCouponValue / ordersWithCoupon : 0;
  const ordersWithoutCoupon = Math.max(0, totalPedidos - ordersWithCoupon);

  const debugInfo: IfoodDebugInfo = {
    totalLinhasRaw: normalizedRows.length,
    totalLinhasComPedido: orderLines.length,
    totalPedidosUnicos: totalPedidos,
    somaMaxValorCesta: round2(debugSomaMaxValorCesta),
    somaMaxBaseCalculo: round2(debugSomaMaxBaseCalculo),
    somaEntradaFinanceira: round2(debugSomaEntradaFinanceira),
    somaCupomLoja: round2(debugSomaCupomLoja),
    somaCupomIfood: round2(debugSomaCupomIfood),
    somaComissao: round2(totalComissao),
    somaTaxaTransacao: round2(totalTaxa),
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
  const totalCupons = data.totalCupomLoja + data.totalCupomIfood;
  const debug = data.debugInfo;

  // BLOQUEANTE: Pedidos == Linhas (não houve agrupamento)
  if (data.totalLinhas > 0 && data.totalPedidos === data.totalLinhas && data.totalPedidos > 1) {
    warnings.push({
      level: "error",
      message: `Número de pedidos (${data.totalPedidos}) é igual ao número de linhas com pedido (${data.totalLinhas}). Não houve consolidação por pedido único.`,
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

  // WARNING: Cupons > 40% do bruto
  if (data.faturamentoBruto > 0 && totalCupons > data.faturamentoBruto * 0.4 && totalCupons <= data.faturamentoBruto) {
    warnings.push({
      level: "warning",
      message: `Total de cupons (${fmt(totalCupons)}) ultrapassa 40% do faturamento bruto (${fmt(data.faturamentoBruto)}).`,
    });
  }

  // BLOQUEANTE: Bruto = 0 mas tem pedidos
  if (data.totalPedidos > 0 && data.faturamentoBruto <= 0) {
    warnings.push({
      level: "error",
      message: `Faturamento bruto é zero mas existem ${data.totalPedidos} pedidos. Verifique a coluna valor_cesta_final.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: Percentual real acima de 50%
  if (data.percentualRealIfood > 50) {
    warnings.push({
      level: "error",
      message: `Percentual real pago ao iFood (${data.percentualRealIfood.toFixed(1)}%) está acima de 50%. Provável erro de consolidação.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: indício de bruto baseado em base_calculo
  if (debug && debug.somaMaxBaseCalculo > 0 && data.faturamentoBruto > 0) {
    const proximityToBase = Math.abs(debug.somaMaxBaseCalculo - data.faturamentoBruto) / data.faturamentoBruto;
    const proximityToCesta = Math.abs(debug.somaMaxValorCesta - data.faturamentoBruto) / data.faturamentoBruto;

    if (proximityToBase < 0.001 && proximityToCesta > 0.01) {
      warnings.push({
        level: "error",
        message: `Indício de cálculo de bruto por base_calculo. Revise a consolidação do valor_cesta_final por pedido.`,
      });
      isBlocked = true;
    }
  }

  // WARNING: Ticket médio muito alto
  if (data.ticketMedio > 500) {
    warnings.push({
      level: "warning",
      message: `Ticket médio (${fmt(data.ticketMedio)}) está acima de R$ 500. Verifique duplicações por pedido.`,
    });
  }

  // WARNING: Reconciliação básica (5%)
  if (data.faturamentoBruto > 0) {
    const expected = data.faturamentoBruto - data.totalComissao - data.totalTaxa - data.totalCupomLoja;
    const diff = Math.abs(expected - data.faturamentoLiquido);
    const margin = data.faturamentoBruto * 0.05;

    if (diff > margin) {
      warnings.push({
        level: "warning",
        message: `Reconciliação: diferença de ${fmt(diff)} entre esperado e líquido real (margem de 5%: ${fmt(margin)}).`,
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
