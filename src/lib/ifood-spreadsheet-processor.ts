/**
 * Processador da planilha oficial de conciliação do iFood
 * Lê o arquivo Excel, agrupa por pedido e consolida métricas financeiras.
 *
 * FÓRMULAS OFICIAIS (devem bater 1:1 com os cards do iFood Financeiro):
 *
 * VALOR_DAS_VENDAS = Σpid(entry + cupom_ifood + cupom_loja − taxa_servico_cliente − taxa_entrega_ifood) + Σpid(ressarc_cancelado)
 * TAXAS_E_COMISSOES = SUM(valor) das linhas de comissão, taxa transação e mensalidade
 * SERVICOS_E_PROMOCOES = SUM(valor) das linhas de promoção loja, entrega sob demanda, anúncios
 * AJUSTES = SUM(valor) das linhas de reembolso taxa serviço
 * TOTAL_FATURAMENTO = VALOR_DAS_VENDAS + TAXAS_E_COMISSOES + SERVICOS_E_PROMOCOES + AJUSTES
 *
 * PERCENTUAL_REAL = (|comissão| + |taxa_transação| + |entrega_ifood|) / VALOR_DAS_VENDAS
 */

export interface ValidationWarning {
  level: "error" | "warning";
  message: string;
}

export interface IfoodDebugInfo {
  totalLinhasRaw: number;
  totalLinhasComPedido: number;
  totalPedidosUnicos: number;
  valorDasVendas: number;
  taxasEComissoes: number;
  servicosEPromocoes: number;
  ajustes: number;
  totalFaturamento: number;
  somaCupomLoja: number;
  somaCupomIfood: number;
  somaComissao: number;
  somaTaxaTransacao: number;
  somaEntregaIfood: number;
}

export interface IfoodConsolidation {
  mesReferencia: string;
  totalPedidos: number;
  totalLinhas: number;
  // iFood official cards
  faturamentoBruto: number;       // = VALOR_DAS_VENDAS
  faturamentoLiquido: number;     // = TOTAL_FATURAMENTO (what you actually receive)
  taxasEComissoes: number;
  servicosEPromocoes: number;
  ajustesIfood: number;
  // Legacy/detail fields
  totalCupomLoja: number;
  totalCupomIfood: number;
  totalComissao: number;
  totalTaxa: number;
  totalAnuncios: number;
  ticketMedio: number;
  percentualMedioComissao: number;
  percentualMedioTaxa: number;
  percentualRealIfood: number;
  // Coupon classification
  couponAbsorber: "business" | "ifood" | "partial";
  couponType: "fixed" | "percent";
  couponAvgValue: number;
  ordersWithCoupon: number;
  ordersWithCouponLojaOnly: number;
  ordersWithCouponIfoodOnly: number;
  ordersWithCouponShared: number;
  ordersWithoutCoupon: number;
  totalCupomShared: number;
  // Delivery
  ordersWithIfoodDelivery: number;
  totalDeliveryCost: number;
  // Validation
  warnings: ValidationWarning[];
  debugInfo?: IfoodDebugInfo;
  isBlocked?: boolean;
}

const REQUIRED_COLUMNS = [
  "competencia",
  "descricao_lancamento",
  "valor",
  "pedido_associado_ifood_curto",
] as const;

// ── Description classification sets ──────────────────────────────

// "Valor das vendas" components
const DESC_ENTRADA_FINANCEIRA = new Set(["entrada financeira"]);
const DESC_CUPOM_IFOOD = new Set(["promocao custeada pelo ifood"]);
const DESC_CUPOM_LOJA = new Set([
  "promocao custeada pela loja",
  "promocao custeada pela loja no delivery",
]);
const DESC_TAXA_SERVICO_CLIENTE = new Set(["taxa de servico ifood cobrada do cliente"]);
const DESC_TAXA_ENTREGA_IFOOD = new Set(["taxa entrega ifood"]);
const DESC_RESSARCIMENTO_CANCELADO = new Set(["ressarcimento de pedido cancelado"]);

// "Taxas e comissões"
const DESC_TAXAS_E_COMISSOES = new Set([
  "taxa de transacao",
  "taxa de transacao ifood beneficios",
  "reembolso taxa de transacao ifood beneficios",
  "comissao do ifood (entrega propria da loja)",
  "comissao do ifood (entrega ifood)",
  "comissao do ifood",
  "mensalidade",
]);

// Subset: only commissions (for percentual real)
const DESC_COMISSAO = new Set([
  "comissao do ifood (entrega propria da loja)",
  "comissao do ifood (entrega ifood)",
  "comissao do ifood",
]);

// Subset: only transaction fees (for percentual real)
const DESC_TAXA_TRANSACAO = new Set([
  "taxa de transacao",
  "taxa de transacao ifood beneficios",
  "reembolso taxa de transacao ifood beneficios",
  "mensalidade",
]);

// "Serviços e promoções"
const DESC_SERVICOS_E_PROMOCOES = new Set([
  "promocao custeada pela loja",
  "promocao custeada pela loja no delivery",
  "solicitacao de entrega sob demanda on",
  "solicitacao de entrega sob demanda off",
  "ocorrencia de debito para contratacao do pacote de anuncios por parte do parceiro.",
]);

// "Ajustes"
const DESC_AJUSTES = new Set(["reembolso taxa de servico ifood cobrada do cliente"]);

// ── Helpers ──────────────────────────────────────────────────────

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
  return base.replace(/\D/g, "");
}

function parseBRValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (raw == null) return 0;
  const str = String(raw).replace(/R\$\s*/g, "").replace(/\s/g, "");
  const normalized = str.replace(/\./g, "").replace(",", ".");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}

function parseBRPercent(raw: unknown): number {
  if (typeof raw === "number") {
    if (raw !== 0 && Math.abs(raw) < 1) return raw * 100;
    return raw;
  }
  if (raw == null) return 0;
  const str = String(raw).replace("%", "").replace(",", ".").trim();
  const val = parseFloat(str);
  if (isNaN(val)) return 0;
  if (val !== 0 && Math.abs(val) < 1 && !String(raw).includes("%")) return val * 100;
  return val;
}

function findKey(row: Record<string, unknown>, target: string): string {
  return Object.keys(row).find((k) => k.includes(target)) || target;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ── Main processor ───────────────────────────────────────────────

export function processIfoodSpreadsheet(rows: Record<string, unknown>[]): IfoodConsolidation {
  if (!rows || rows.length === 0) {
    throw new Error("Planilha vazia. Nenhuma linha encontrada.");
  }

  // Normalize headers
  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  });

  // Validate required columns
  const sampleKeys = Object.keys(normalizedRows[0]);
  const missing = REQUIRED_COLUMNS.filter((col) => !sampleKeys.some((k) => k.includes(col)));
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias não encontradas: ${missing.join(", ")}. Verifique se é a planilha de conciliação do iFood.`
    );
  }

  // Extract reference month
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

  // Resolve column keys
  const orderKey = findKey(firstRow, "pedido_associado_ifood_curto");
  const descKey = findKey(firstRow, "descricao_lancamento");
  const valorKey = findKey(firstRow, "valor");
  const percKey = findKey(firstRow, "percentual_taxa");

  // ── Separate lines WITH and WITHOUT order id ──
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

  // Group by order
  const orderGroups = new Map<string, Record<string, unknown>[]>();
  for (const item of orderLines) {
    if (!orderGroups.has(item.orderId)) {
      orderGroups.set(item.orderId, []);
    }
    orderGroups.get(item.orderId)!.push(item.row);
  }

  // ── Per-order aggregation ──
  let valorDasVendas = 0;
  let totalTaxasEComissoes = 0;

  let totalCupomLoja = 0;
  let totalCupomIfood = 0;
  let totalComissao = 0;
  let totalTaxaTransacao = 0;
  let totalEntregaIfood = 0;

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
    // Per-order accumulators for VALOR_DAS_VENDAS formula
    let orderEntry = 0;
    let orderCupomIfood = 0;
    let orderCupomLoja = 0;
    let orderTaxaServicoCliente = 0;
    let orderTaxaEntregaIfood = 0;
    let orderRessarcCancelado = 0;

    // Per-order accumulators for TAXAS_E_COMISSOES
    let orderTaxasEComissoes = 0;

    // Detail accumulators
    let orderComissao = 0;
    let orderTaxaTransacao = 0;
    let orderDelivery = 0;

    for (const line of lines) {
      const valor = parseBRValue(line[valorKey]);
      const perc = parseBRPercent(line[percKey]);
      const desc = normalizeDescription(line[descKey]);

      // ── VALOR DAS VENDAS components ──
      if (DESC_ENTRADA_FINANCEIRA.has(desc)) {
        orderEntry += valor;
      }
      if (DESC_CUPOM_IFOOD.has(desc)) {
        orderCupomIfood += valor; // comes positive in XLSX
      }
      if (DESC_CUPOM_LOJA.has(desc)) {
        orderCupomLoja += valor; // comes negative in XLSX
      }
      if (DESC_TAXA_SERVICO_CLIENTE.has(desc)) {
        orderTaxaServicoCliente += valor;
      }
      if (DESC_TAXA_ENTREGA_IFOOD.has(desc)) {
        orderTaxaEntregaIfood += valor;
      }
      if (DESC_RESSARCIMENTO_CANCELADO.has(desc)) {
        orderRessarcCancelado += valor;
      }

      // ── TAXAS E COMISSOES ──
      if (DESC_TAXAS_E_COMISSOES.has(desc)) {
        orderTaxasEComissoes += valor;
      }

      // ── Detail: commission vs taxa ──
      if (DESC_COMISSAO.has(desc)) {
        orderComissao += valor;
        if (perc > 0) comissaoPercentages.push(perc);
      }
      if (DESC_TAXA_TRANSACAO.has(desc)) {
        orderTaxaTransacao += valor;
        if (perc > 0) taxaPercentages.push(perc);
      }

      // Delivery cost (for iFood delivery orders)
      if (desc.includes("entrega") && desc.includes("ifood") && !DESC_TAXA_ENTREGA_IFOOD.has(desc)) {
        orderDelivery += valor;
      }
    }

    // VALOR_DAS_VENDAS per order:
    // entry + cupom_ifood + cupom_loja(negative→adds coupon back) − taxa_servico_cliente − taxa_entrega_ifood + ressarc_cancelado
    const orderVenda = orderEntry + orderCupomIfood + orderCupomLoja
      - orderTaxaServicoCliente - orderTaxaEntregaIfood + orderRessarcCancelado;

    valorDasVendas += orderVenda;
    totalTaxasEComissoes += orderTaxasEComissoes;

    // Coupons (absolute values for display)
    const cupomLojaAbs = Math.abs(orderCupomLoja);
    const cupomIfoodAbs = Math.abs(orderCupomIfood);
    totalCupomLoja += cupomLojaAbs;
    totalCupomIfood += cupomIfoodAbs;
    totalComissao += Math.abs(orderComissao);
    totalTaxaTransacao += Math.abs(orderTaxaTransacao);

    // Delivery
    const deliveryAbs = Math.abs(orderDelivery);
    totalEntregaIfood += Math.abs(orderTaxaEntregaIfood);
    if (deliveryAbs > 0 || Math.abs(orderTaxaEntregaIfood) > 0) {
      ordersWithIfoodDelivery++;
      totalDeliveryCost += deliveryAbs + Math.abs(orderTaxaEntregaIfood);
    }

    // Coupon classification per order
    const hasLoja = cupomLojaAbs > 0;
    const hasIfood = cupomIfoodAbs > 0;
    if (hasLoja || hasIfood) {
      ordersWithCoupon++;
      if (hasLoja && hasIfood) {
        ordersWithCouponShared++;
        totalCupomShared += cupomLojaAbs + cupomIfoodAbs;
      } else if (hasLoja) {
        ordersWithCouponLojaOnly++;
      } else {
        ordersWithCouponIfoodOnly++;
      }
    }
  }

  // ── Lines WITHOUT order: Serviços e Promoções + Ajustes + Anúncios ──
  let totalServicosEPromocoes = 0;
  let totalAjustes = 0;
  let totalAnuncios = 0;

  // Also count order-level "Serviços e Promoções" (cupom loja lines are part of this)
  for (const row of normalizedRows) {
    const desc = normalizeDescription(row[descKey]);
    const valor = parseBRValue(row[valorKey]);

    if (DESC_SERVICOS_E_PROMOCOES.has(desc)) {
      totalServicosEPromocoes += valor;
    }
    if (DESC_AJUSTES.has(desc)) {
      totalAjustes += valor;
    }
    // Anúncios (ads) — informational only
    if (desc.includes("anuncio") || desc.includes("ads") || desc.includes("publicidade") || desc.includes("pacote")) {
      if (!DESC_SERVICOS_E_PROMOCOES.has(desc)) {
        totalAnuncios += Math.abs(valor);
      }
    }
  }

  // Reconcile total taxas from all lines (not just order lines)
  let totalTaxasEComissoesAllLines = 0;
  for (const row of normalizedRows) {
    const desc = normalizeDescription(row[descKey]);
    const valor = parseBRValue(row[valorKey]);
    if (DESC_TAXAS_E_COMISSOES.has(desc)) {
      totalTaxasEComissoesAllLines += valor;
    }
  }

  // ── Official iFood cards ──
  const faturamentoBruto = round2(valorDasVendas);
  const taxasEComissoes = round2(totalTaxasEComissoesAllLines);
  const servicosEPromocoes = round2(totalServicosEPromocoes);
  const ajustesIfood = round2(totalAjustes);
  const totalFaturamento = round2(faturamentoBruto + taxasEComissoes + servicosEPromocoes + ajustesIfood);

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

  // PERCENTUAL_REAL = (|comissão| + |taxa_transação| + entrega_ifood) / VALOR_DAS_VENDAS
  const percentualRealIfood =
    faturamentoBruto > 0
      ? ((totalComissao + totalTaxaTransacao + totalEntregaIfood) / faturamentoBruto) * 100
      : 0;

  let couponAbsorber: "business" | "ifood" | "partial" = "business";
  if (totalCupomLoja > 0 && totalCupomIfood > 0) couponAbsorber = "partial";
  else if (totalCupomIfood > 0 && totalCupomLoja === 0) couponAbsorber = "ifood";

  const totalCouponValue = totalCupomLoja + totalCupomIfood;
  const couponAvgValue = ordersWithCoupon > 0 ? totalCouponValue / ordersWithCoupon : 0;
  const ordersWithoutCoupon = Math.max(0, totalPedidos - ordersWithCoupon);

  const debugInfo: IfoodDebugInfo = {
    totalLinhasRaw: normalizedRows.length,
    totalLinhasComPedido: orderLines.length,
    totalPedidosUnicos: totalPedidos,
    valorDasVendas: round2(valorDasVendas),
    taxasEComissoes: round2(taxasEComissoes),
    servicosEPromocoes: round2(servicosEPromocoes),
    ajustes: round2(ajustesIfood),
    totalFaturamento: round2(totalFaturamento),
    somaCupomLoja: round2(totalCupomLoja),
    somaCupomIfood: round2(totalCupomIfood),
    somaComissao: round2(totalComissao),
    somaTaxaTransacao: round2(totalTaxaTransacao),
    somaEntregaIfood: round2(totalEntregaIfood),
  };

  const result: IfoodConsolidation = {
    mesReferencia,
    totalPedidos,
    totalLinhas,
    faturamentoBruto,
    faturamentoLiquido: totalFaturamento,
    taxasEComissoes,
    servicosEPromocoes,
    ajustesIfood,
    totalCupomLoja: round2(totalCupomLoja),
    totalCupomIfood: round2(totalCupomIfood),
    totalComissao: round2(totalComissao),
    totalTaxa: round2(totalTaxaTransacao),
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

// ── Validation ───────────────────────────────────────────────────

function validateConsolidation(data: IfoodConsolidation): { warnings: ValidationWarning[]; isBlocked: boolean } {
  const warnings: ValidationWarning[] = [];
  let isBlocked = false;
  const totalCupons = data.totalCupomLoja + data.totalCupomIfood;

  // BLOQUEANTE: Pedidos == Linhas (não houve agrupamento)
  if (data.totalLinhas > 0 && data.totalPedidos === data.totalLinhas && data.totalPedidos > 1) {
    warnings.push({
      level: "error",
      message: `Número de pedidos (${data.totalPedidos}) é igual ao número de linhas (${data.totalLinhas}). Não houve consolidação por pedido.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: Cupons > Bruto
  if (data.faturamentoBruto > 0 && totalCupons > data.faturamentoBruto) {
    warnings.push({
      level: "error",
      message: `Total de cupons (${fmt(totalCupons)}) é maior que o Valor das Vendas (${fmt(data.faturamentoBruto)}). Dados inconsistentes.`,
    });
    isBlocked = true;
  }

  // BLOQUEANTE: Bruto = 0 mas tem pedidos
  if (data.totalPedidos > 0 && data.faturamentoBruto <= 0) {
    warnings.push({
      level: "error",
      message: `Valor das Vendas é zero mas existem ${data.totalPedidos} pedidos.`,
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

  // WARNING: Cupons > 40% do bruto
  if (data.faturamentoBruto > 0 && totalCupons > data.faturamentoBruto * 0.4 && totalCupons <= data.faturamentoBruto) {
    warnings.push({
      level: "warning",
      message: `Total de cupons (${fmt(totalCupons)}) ultrapassa 40% do Valor das Vendas (${fmt(data.faturamentoBruto)}).`,
    });
  }

  // WARNING: Ticket médio muito alto
  if (data.ticketMedio > 500) {
    warnings.push({
      level: "warning",
      message: `Ticket médio (${fmt(data.ticketMedio)}) está acima de R$ 500.`,
    });
  }

  return { warnings, isBlocked };
}
