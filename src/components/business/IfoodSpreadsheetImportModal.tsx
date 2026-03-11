import { useState, useCallback, useRef, useEffect } from "react";
import { toLocaleDateBR } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  Percent,
  Megaphone,
  RefreshCw,
  Ticket,
  Truck,
  ArrowRight,
  TrendingUp,
  Eye,
  Package,
  CircleDollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  processIfoodSpreadsheet,
  type IfoodConsolidation,
} from "@/lib/ifood-spreadsheet-processor";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface IfoodSpreadsheetImportModalProps {
  userId: string;
  storeId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: IfoodConsolidation) => void;
}

type Step = "upload" | "dashboard" | "done";

interface MonthlyMetric {
  competencia: string;
  valor_das_vendas: number;
  ticket_medio: number;
  cupom_loja_total: number;
  cupom_ifood_total: number;
  custo_extra_percentual: number;
  total_faturamento: number;
  total_pedidos_unicos: number;
}

// ── Small UI Components ──

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = "default",
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  variant?: "default" | "danger" | "success" | "warning" | "muted" | "info";
  className?: string;
}) {
  const variantStyles: Record<string, string> = {
    default: "bg-card border-border",
    danger: "bg-destructive/5 border-destructive/20",
    success: "bg-green-500/5 border-green-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    muted: "bg-muted/30 border-border",
    info: "bg-blue-500/5 border-blue-500/20",
  };
  const iconColors: Record<string, string> = {
    default: "text-primary",
    danger: "text-destructive",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div className={`rounded-xl border p-3 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
        <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
      </div>
      <p className="font-bold text-lg font-mono leading-tight">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
    </div>
  );
}

function StatRow({ label, value, sub, bold }: { label: string; value: string | number; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono ${bold ? "font-bold text-foreground" : "font-semibold"}`}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

// ── Formatters ──

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const fmtPct = (value: number) => `${value.toFixed(2)}%`;

const fmtShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return fmt(value);
};

// ── Default ──

const DEFAULT_CONSOLIDATION: IfoodConsolidation = {
  mesReferencia: "", totalPedidos: 0, totalLinhas: 0,
  faturamentoBruto: 0, faturamentoLiquido: 0, taxasEComissoes: 0,
  servicosEPromocoes: 0, ajustesIfood: 0, totalCupomLoja: 0,
  totalCupomIfood: 0, totalComissao: 0, totalTaxa: 0, totalAnuncios: 0,
  ticketMedio: 0, percentualMedioComissao: 0, percentualMedioTaxa: 0,
  percentualRealIfood: 0, couponAbsorber: "business", couponType: "fixed",
  couponAvgValue: 0, ordersWithCoupon: 0, ordersWithCouponLojaOnly: 0,
  ordersWithCouponIfoodOnly: 0, ordersWithCouponShared: 0,
  ordersWithoutCoupon: 0, totalCupomShared: 0, ordersWithIfoodDelivery: 0,
  totalDeliveryCost: 0, custoExtraTotal: 0, custoExtraPercentual: 0,
  warnings: [],
};

// ── Main Component ──

export default function IfoodSpreadsheetImportModal({
  userId,
  storeId,
  open,
  onOpenChange,
  onApply,
}: IfoodSpreadsheetImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [consolidation, setConsolidation] = useState<IfoodConsolidation | null>(null);
  const [lastImport, setLastImport] = useState<IfoodConsolidation | null>(null);
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyMetric[]>([]);
  const [ifoodPlan, setIfoodPlan] = useState<12 | 23>(12);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLastImport = useCallback(async () => {
    let query = supabase
      .from("ifood_monthly_metrics")
      .select("*")
      .eq("user_id", userId);

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data } = await query
      .order("updated_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0];
      const bruto = Number(row.valor_das_vendas);
      const taxasEComissoes = Number(row.taxas_comissoes_total);
      const servicosEPromocoes = Number(row.servicos_promocoes_total);
      const ajustes = Number(row.ajustes_total);
      const liquido = Number(row.total_faturamento);
      const totalComissao = Number(row.total_comissao);
      const totalTaxa = Number(row.total_taxa_transacao);
      const totalPedidos = Number(row.total_pedidos_unicos);
      const percentualMedioComissao = totalPedidos > 0 && bruto > 0 ? (totalComissao / bruto) * 100 : 0;
      const percentualMedioTaxa = totalPedidos > 0 && bruto > 0 ? (totalTaxa / bruto) * 100 : 0;

      setLastImport({
        ...DEFAULT_CONSOLIDATION,
        mesReferencia: row.competencia,
        totalPedidos,
        faturamentoBruto: bruto,
        faturamentoLiquido: liquido,
        taxasEComissoes,
        servicosEPromocoes,
        ajustesIfood: ajustes,
        totalCupomLoja: Number(row.cupom_loja_total),
        totalCupomIfood: Number(row.cupom_ifood_total),
        totalComissao,
        totalTaxa,
        totalAnuncios: Number(row.anuncios_total),
        totalDeliveryCost: Number(row.entrega_ifood_custo_total),
        ordersWithIfoodDelivery: Number(row.entrega_ifood_pedidos),
        ordersWithCoupon: Number(row.pedidos_com_cupom_total),
        ordersWithoutCoupon: Number(row.pedidos_sem_cupom_total),
        ordersWithCouponLojaOnly: Number(row.pedidos_so_loja_cupom),
        ordersWithCouponIfoodOnly: Number(row.pedidos_so_ifood_cupom),
        ordersWithCouponShared: Number(row.pedidos_ambos_cupom),
        ticketMedio: Number(row.ticket_medio),
        percentualMedioComissao,
        percentualMedioTaxa,
        percentualRealIfood: Number(row.percentual_real_ifood),
        custoExtraTotal: Number(row.custo_extra_total),
        custoExtraPercentual: Number(row.custo_extra_percentual),
      });
      setLastImportDate(new Date(row.updated_at).toLocaleDateString("pt-BR"));
      setStep("dashboard");
    }
  }, [userId, storeId]);

  const loadMonthlyHistory = useCallback(async () => {
    let query = supabase
      .from("ifood_monthly_metrics")
      .select("competencia, valor_das_vendas, ticket_medio, cupom_loja_total, cupom_ifood_total, custo_extra_percentual, total_faturamento, total_pedidos_unicos")
      .eq("user_id", userId);

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data } = await query
      .order("competencia", { ascending: true })
      .limit(24);

    if (data) {
      setMonthlyHistory(data.map(d => ({
        competencia: d.competencia,
        valor_das_vendas: Number(d.valor_das_vendas),
        ticket_medio: Number(d.ticket_medio),
        cupom_loja_total: Number(d.cupom_loja_total),
        cupom_ifood_total: Number(d.cupom_ifood_total),
        custo_extra_percentual: Number(d.custo_extra_percentual),
        total_faturamento: Number(d.total_faturamento),
        total_pedidos_unicos: Number(d.total_pedidos_unicos),
      })));
    }
  }, [userId, storeId]);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setStep("upload");
      setConsolidation(null);
      setError(null);
      setShowTutorial(false);
      loadLastImport();
      loadMonthlyHistory();
    }
    onOpenChange(v);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      setError("Apenas arquivos .xlsx ou .xls são aceitos.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (!rows || rows.length === 0) {
        throw new Error("Planilha vazia. Nenhum dado encontrado.");
      }

      const result = processIfoodSpreadsheet(rows);
      setConsolidation(result);
      setStep("dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao processar planilha.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!consolidation) return;

    setIsProcessing(true);
    try {
      // Save to ifood_import_logs (legacy)
      await supabase
        .from("ifood_import_logs")
        .insert({
          user_id: userId,
          store_id: storeId || null,
          mes_referencia: consolidation.mesReferencia,
          faturamento_bruto: consolidation.faturamentoBruto,
          faturamento_liquido: consolidation.faturamentoLiquido,
          total_pedidos: consolidation.totalPedidos,
          total_cupom_loja: consolidation.totalCupomLoja,
          total_cupom_ifood: consolidation.totalCupomIfood,
          total_comissao: consolidation.totalComissao,
          total_taxa: consolidation.totalTaxa,
          total_anuncios: consolidation.totalAnuncios,
          percentual_real_ifood: consolidation.percentualRealIfood,
          ticket_medio: consolidation.ticketMedio,
          percentual_medio_comissao: consolidation.percentualMedioComissao,
          percentual_medio_taxa: consolidation.percentualMedioTaxa,
        });

      // Compute custo extra with selected plan
      const custoBaseEstimado = (ifoodPlan / 100) * consolidation.faturamentoBruto;
      const custoTotalIfood = Math.abs(consolidation.taxasEComissoes) + Math.abs(consolidation.servicosEPromocoes);
      const custoExtraTotal = custoTotalIfood - custoBaseEstimado;
      const custoExtraPercentual = consolidation.faturamentoBruto > 0
        ? (custoExtraTotal / consolidation.faturamentoBruto) * 100
        : 0;

      // Delete existing row then insert (avoids NULL store_id upsert issues)
      if (storeId) {
        await supabase
          .from("ifood_monthly_metrics")
          .delete()
          .eq("user_id", userId)
          .eq("competencia", consolidation.mesReferencia)
          .eq("store_id", storeId);
      } else {
        await supabase
          .from("ifood_monthly_metrics")
          .delete()
          .eq("user_id", userId)
          .eq("competencia", consolidation.mesReferencia)
          .is("store_id", null);
      }

      const { error: upsertError } = await supabase
        .from("ifood_monthly_metrics")
        .insert({
          user_id: userId,
          store_id: storeId || null,
          competencia: consolidation.mesReferencia,
          valor_das_vendas: consolidation.faturamentoBruto,
          taxas_comissoes_total: consolidation.taxasEComissoes,
          servicos_promocoes_total: consolidation.servicosEPromocoes,
          ajustes_total: consolidation.ajustesIfood,
          total_faturamento: consolidation.faturamentoLiquido,
          total_pedidos_unicos: consolidation.totalPedidos,
          ticket_medio: consolidation.ticketMedio,
          cupom_loja_total: consolidation.totalCupomLoja,
          cupom_ifood_total: consolidation.totalCupomIfood,
          pedidos_com_cupom_total: consolidation.ordersWithCoupon,
          pedidos_sem_cupom_total: consolidation.ordersWithoutCoupon,
          pedidos_so_loja_cupom: consolidation.ordersWithCouponLojaOnly,
          pedidos_so_ifood_cupom: consolidation.ordersWithCouponIfoodOnly,
          pedidos_ambos_cupom: consolidation.ordersWithCouponShared,
          entrega_ifood_pedidos: consolidation.ordersWithIfoodDelivery,
          entrega_ifood_custo_total: consolidation.totalDeliveryCost,
          anuncios_total: consolidation.totalAnuncios,
          custo_extra_total: custoExtraTotal,
          custo_extra_percentual: custoExtraPercentual,
          total_comissao: consolidation.totalComissao,
          total_taxa_transacao: consolidation.totalTaxa,
          percentual_real_ifood: consolidation.percentualRealIfood,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }

      // Update consolidation with custo extra values
      consolidation.custoExtraTotal = custoExtraTotal;
      consolidation.custoExtraPercentual = custoExtraPercentual;

      onApply(consolidation);
      setLastImport(consolidation);
      setLastImportDate(new Date().toLocaleDateString("pt-BR"));
      setStep("done");
      toast.success("Dados importados com sucesso!");
      loadMonthlyHistory();
    } catch (err: any) {
      toast.error("Erro ao salvar importação: " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const displayData = consolidation || lastImport;
  const isNewImport = !!consolidation;

  // ── Render: Upload Step ──
  const renderUpload = () => (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-base font-semibold text-foreground">Selecione a planilha de conciliação</p>
        <p className="text-sm text-muted-foreground mt-1">Arquivo .xlsx ou .xls do Portal iFood</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Processando planilha...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        onClick={() => setShowTutorial(!showTutorial)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Info className="h-4 w-4" />
        Como baixar a planilha do iFood
        {showTutorial ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {showTutorial && (
        <div className="p-4 bg-muted/30 rounded-xl space-y-2 text-sm border border-border">
          <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
            <li>No Portal do Parceiro iFood, acesse <strong className="text-foreground">Relatórios</strong></li>
            <li>Clique em <strong className="text-foreground">Vendas → Conciliação</strong></li>
            <li>Selecione o mês e clique em <strong className="text-foreground">Exportar</strong></li>
            <li>Vá em <strong className="text-foreground">Relatórios → Exportações → Baixar</strong></li>
            <li>Envie o arquivo aqui</li>
          </ol>
        </div>
      )}
    </div>
  );

  // ── Render: Dashboard Step ──
  const renderDashboard = (data: IfoodConsolidation) => {
    const totalCupons = data.totalCupomLoja + data.totalCupomIfood;
    const warnings = data.warnings || [];
    const hasErrors = warnings.some(w => w.level === "error");
    const isBlocked = data.isBlocked === true;

    // Custo extra calculation for display
    const custoBaseEstimado = (ifoodPlan / 100) * data.faturamentoBruto;
    const custoTotalIfood = Math.abs(data.taxasEComissoes) + Math.abs(data.servicosEPromocoes);
    const custoExtraDisplay = custoTotalIfood - custoBaseEstimado;
    const custoExtraPctDisplay = data.faturamentoBruto > 0
      ? (custoExtraDisplay / data.faturamentoBruto) * 100
      : 0;

    // Ads CPA
    const adsCPA = data.totalPedidos > 0 && data.totalAnuncios > 0
      ? data.totalAnuncios / data.totalPedidos
      : 0;
    const adsCPALabel = adsCPA <= 2 ? "Bom" : adsCPA <= 5 ? "Regular" : "Ruim";
    const adsCPAColor = adsCPA <= 2 ? "text-green-600" : adsCPA <= 5 ? "text-amber-600" : "text-destructive";

    return (
      <div className="space-y-4">
        {/* Blocked banner */}
        {isBlocked && (
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-destructive bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Dados bloqueados — inconsistência detectada</p>
              <p className="text-xs text-destructive/80 mt-1">
                Os dados apresentam erros e não podem ser aplicados. Verifique se é a planilha oficial do iFood.
              </p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && !isBlocked && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                w.level === "error"
                  ? "bg-destructive/10 border border-destructive/30 text-destructive"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
              }`}>
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {!isBlocked && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {isNewImport ? "Nova planilha processada" : "Última importação"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">{data.mesReferencia}</Badge>
                {!isNewImport && lastImportDate && (
                  <Badge variant="secondary" className="text-xs">{lastImportDate}</Badge>
                )}
              </div>
            </div>

            {/* Grouping info */}
            {data.totalLinhas > 0 && data.totalLinhas !== data.totalPedidos && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{data.totalLinhas}</strong> linhas → <strong className="text-foreground">{data.totalPedidos}</strong> pedidos únicos
                </p>
              </div>
            )}

            {/* ── MAIN SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={DollarSign}
                label="Valor das Vendas"
                value={fmt(data.faturamentoBruto)}
                variant="success"
              />
              <MetricCard
                icon={ShoppingCart}
                label="Pedidos"
                value={data.totalPedidos.toLocaleString("pt-BR")}
                subValue={`Ticket: ${fmt(data.ticketMedio)}`}
              />
              <MetricCard
                icon={ArrowRight}
                label="Você Recebe"
                value={fmt(data.faturamentoLiquido)}
                subValue={data.faturamentoBruto > 0 ? `${((data.faturamentoLiquido / data.faturamentoBruto) * 100).toFixed(1)}% do bruto` : ""}
                variant="info"
              />
              <MetricCard
                icon={Receipt}
                label="iFood Retém"
                value={fmt(data.faturamentoBruto - data.faturamentoLiquido)}
                subValue={fmtPct(data.percentualRealIfood)}
                variant="danger"
              />
            </div>

            {/* Revenue bar */}
            {data.faturamentoBruto > 0 && (
              <div className="space-y-1.5">
                <Progress
                  value={Math.max(0, Math.min(100, (data.faturamentoLiquido / data.faturamentoBruto) * 100))}
                  className="h-2.5 bg-destructive/15 [&>div]:bg-green-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Você recebe {((data.faturamentoLiquido / data.faturamentoBruto) * 100).toFixed(1)}%</span>
                  <span>iFood retém {((1 - data.faturamentoLiquido / data.faturamentoBruto) * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* ── TABS ── */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="details" className="text-xs">Resumo</TabsTrigger>
                <TabsTrigger value="coupons" className="text-xs">Cupons</TabsTrigger>
                <TabsTrigger value="costs" className="text-xs">Custos</TabsTrigger>
                <TabsTrigger value="charts" className="text-xs">Evolução</TabsTrigger>
              </TabsList>

              {/* ── TAB: Details ── */}
              <TabsContent value="details" className="space-y-3 mt-3">
                <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Reconciliação iFood
                  </p>
                  <StatRow label="Valor das Vendas" value={fmt(data.faturamentoBruto)} bold />
                  <StatRow label="Taxas e Comissões" value={fmt(data.taxasEComissoes)} />
                  <StatRow label="Serviços e Promoções" value={fmt(data.servicosEPromocoes)} />
                  <StatRow label="Ajustes" value={fmt(data.ajustesIfood)} />
                  <Separator className="my-1" />
                  <StatRow label="Total Faturamento" value={fmt(data.faturamentoLiquido)} bold />
                </div>

                {/* Ads card */}
                {data.totalAnuncios > 0 && (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-purple-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Anúncios no Mês
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total investido</p>
                        <p className="text-base font-bold font-mono">{fmt(data.totalAnuncios)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPA (custo/pedido)</p>
                        <p className={`text-base font-bold font-mono ${adsCPAColor}`}>
                          {fmt(adsCPA)} <span className="text-xs font-normal">({adsCPALabel})</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => setShowAuditModal(true)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver auditoria técnica
                </Button>
              </TabsContent>

              {/* ── TAB: Coupons ── */}
              <TabsContent value="coupons" className="space-y-3 mt-3">
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Ticket className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Quem pagou o cupom?
                    </p>
                  </div>

                  <StatRow
                    label="🏪 Só eu paguei"
                    value={`${data.ordersWithCouponLojaOnly} pedidos`}
                    sub={data.totalCupomLoja > 0 && data.ordersWithCouponShared === 0 ? fmt(data.totalCupomLoja) : ""}
                  />
                  <StatRow
                    label="🟠 Só iFood pagou"
                    value={`${data.ordersWithCouponIfoodOnly} pedidos`}
                    sub={data.totalCupomIfood > 0 && data.ordersWithCouponShared === 0 ? fmt(data.totalCupomIfood) : ""}
                  />
                  <StatRow
                    label="🤝 Nós dois pagamos"
                    value={`${data.ordersWithCouponShared} pedidos`}
                    sub={data.totalCupomShared > 0 ? fmt(data.totalCupomShared) : ""}
                  />
                  <Separator className="my-1" />
                  <StatRow
                    label="Pedidos COM cupom"
                    value={data.ordersWithCoupon}
                    sub={data.totalPedidos > 0 ? `(${((data.ordersWithCoupon / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
                  />
                  <StatRow
                    label="Pedidos SEM cupom"
                    value={data.ordersWithoutCoupon}
                    sub={data.totalPedidos > 0 ? `(${((data.ordersWithoutCoupon / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
                  />
                </div>

                {totalCupons > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total gasto com cupons</span>
                      <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{fmt(totalCupons)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Cupom loja: <strong className="text-foreground">{fmt(data.totalCupomLoja)}</strong></span>
                      <span>Cupom iFood: <strong className="text-foreground">{fmt(data.totalCupomIfood)}</strong></span>
                    </div>
                  </div>
                )}

                {/* Delivery */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entrega iFood</p>
                  </div>
                  <StatRow
                    label="Pedidos com entrega iFood"
                    value={data.ordersWithIfoodDelivery}
                    sub={data.totalPedidos > 0 ? `(${((data.ordersWithIfoodDelivery / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
                  />
                  <StatRow label="Custo total entrega" value={fmt(data.totalDeliveryCost)} />
                  {data.ordersWithIfoodDelivery === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma entrega via iFood detectada.</p>
                  )}
                </div>
              </TabsContent>

              {/* ── TAB: Costs ── */}
              <TabsContent value="costs" className="space-y-3 mt-3">
                {/* Plan selector */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Seu plano iFood
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={ifoodPlan === 12 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIfoodPlan(12)}
                      className="text-xs"
                    >
                      Básico (12%)
                    </Button>
                    <Button
                      variant={ifoodPlan === 23 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIfoodPlan(23)}
                      className="text-xs"
                    >
                      Entrega (23%)
                    </Button>
                  </div>
                </div>

                {/* Custo extra card */}
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold">Custo Extra Real do iFood</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quanto você paga <strong>além</strong> da taxa base de {ifoodPlan}% (cupons, entrega, serviços).
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground">Taxa base ({ifoodPlan}%)</p>
                      <p className="text-base font-bold font-mono">{fmt(custoBaseEstimado)}</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground">Custo total iFood</p>
                      <p className="text-base font-bold font-mono">{fmt(custoTotalIfood)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Custo extra</span>
                    <div className="text-right">
                      <p className={`text-xl font-extrabold font-mono ${custoExtraDisplay > 0 ? "text-destructive" : "text-green-600"}`}>
                        {fmt(custoExtraDisplay)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtPct(custoExtraPctDisplay)} do faturamento
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 border border-border p-2.5 mt-1">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <Info className="h-3 w-3 inline-block mr-1 -mt-0.5" />
                      O custo total pago ao iFood é fixo ({fmt(custoTotalIfood)}). O "custo extra" é quanto você paga <strong>além</strong> da taxa base do plano selecionado. No plano de 12%, a base é menor, então o extra parece maior. No de 23%, a base já cobre mais do total.
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Composição
                  </p>
                  <StatRow label="Comissão iFood" value={fmt(data.totalComissao)} sub={fmtPct(data.percentualMedioComissao)} />
                  <StatRow label="Taxa transação" value={fmt(data.totalTaxa)} sub={fmtPct(data.percentualMedioTaxa)} />
                  <StatRow label="Entrega iFood" value={fmt(data.totalDeliveryCost)} />
                  <StatRow label="Cupom loja" value={fmt(data.totalCupomLoja)} />
                  <Separator className="my-1" />
                  <StatRow label="% real pago ao iFood" value={fmtPct(data.percentualRealIfood)} bold />
                </div>
              </TabsContent>

              {/* ── TAB: Charts ── */}
              <TabsContent value="charts" className="space-y-3 mt-3">
                {monthlyHistory.length < 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Importe pelo menos 2 meses para ver gráficos de evolução.</p>
                    <p className="text-xs mt-1">Cada planilha importada é salva automaticamente.</p>
                  </div>
                ) : (
                  <>
                    {/* Sales chart */}
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Valor das Vendas por Mês
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={monthlyHistory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="competencia" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtShort(v)} className="text-muted-foreground" />
                          <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => `Mês: ${l}`} />
                          <Line type="monotone" dataKey="valor_das_vendas" name="Vendas" className="stroke-primary" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Ticket chart */}
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Ticket Médio
                      </p>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={monthlyHistory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="competencia" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Line type="monotone" dataKey="ticket_medio" name="Ticket" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Coupons stacked bar */}
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Cupons: Loja vs iFood
                      </p>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={monthlyHistory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="competencia" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtShort(v)} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="cupom_loja_total" name="Cupom Loja" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="cupom_ifood_total" name="Cupom iFood" stackId="a" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {isNewImport && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setConsolidation(null); setStep("upload"); }}
                    disabled={isProcessing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={isProcessing || hasErrors || isBlocked}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Aplicar ao Plano
                  </Button>
                </DialogFooter>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4" />
                {isNewImport ? "Trocar planilha" : "Importar nova planilha"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Audit Modal ──
  const renderAuditModal = () => {
    const data = displayData;
    if (!data?.debugInfo) return null;
    const d = data.debugInfo;
    const cats = d.descricoesPorCategoria || {};

    return (
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" /> Auditoria Técnica — {data.mesReferencia}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-border p-3 space-y-1 font-mono">
              <p>Linhas totais: <strong>{d.totalLinhasRaw}</strong></p>
              <p>Linhas com pedido: <strong>{d.totalLinhasComPedido}</strong></p>
              <p>Pedidos únicos: <strong>{d.totalPedidosUnicos}</strong></p>
              <Separator className="my-2" />
              <p>Σ Entrada Financeira: <strong>{fmt(d.somaEntradaFinanceira)}</strong></p>
              <p>Σ MAX(base_calculo): <strong>{fmt(d.somaMaxBaseCalculo)}</strong></p>
              <p>Valor itens + entrega própria: <strong>{fmt(d.valorItensEEntregaPropria)}</strong></p>
              <p>Ressarcimentos: <strong>{fmt(d.ressarcimentosCancelados)}</strong></p>
              <Separator className="my-2" />
              <p className="font-bold">VALOR DAS VENDAS: {fmt(d.valorDasVendas)}</p>
              <p>TAXAS E COMISSÕES: {fmt(d.taxasEComissoes)}</p>
              <p>SERVIÇOS E PROMOÇÕES: {fmt(d.servicosEPromocoes)}</p>
              <p>AJUSTES: {fmt(d.ajustes)}</p>
              <p className="font-bold">TOTAL FATURAMENTO: {fmt(d.totalFaturamento)}</p>
              <Separator className="my-2" />
              <p>Cupom loja: {fmt(d.somaCupomLoja)}</p>
              <p>Cupom iFood: {fmt(d.somaCupomIfood)}</p>
              <p>Comissão: {fmt(d.somaComissao)}</p>
              <p>Taxa transação: {fmt(d.somaTaxaTransacao)}</p>
              <p>Entrega iFood: {fmt(d.somaEntregaIfood)}</p>
              <p>Anúncios: {fmt(d.somaAnuncios)}</p>
            </div>

            {Object.keys(cats).length > 0 && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="font-semibold text-sm">Descrições encontradas por categoria</p>
                {Object.entries(cats).map(([cat, descs]) => (
                  descs.length > 0 && (
                    <div key={cat}>
                      <p className="font-medium text-muted-foreground capitalize">{cat} ({descs.length})</p>
                      <ul className="ml-3 text-muted-foreground">
                        {descs.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Raio-X Financeiro iFood
            </DialogTitle>
            <DialogDescription>
              Análise detalhada dos seus dados financeiros do iFood.
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && renderUpload()}
          {step === "dashboard" && displayData && renderDashboard(displayData)}

          {step === "dashboard" && isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Processando nova planilha...</span>
            </div>
          )}

          {step === "dashboard" && error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg text-foreground">Dados aplicados com sucesso!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Os campos do Plano iFood foram atualizados e o histórico mensal foi salvo.
                </p>
              </div>
              <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {renderAuditModal()}
    </>
  );
}
