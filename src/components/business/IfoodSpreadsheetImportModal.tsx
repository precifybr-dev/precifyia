import { useState, useCallback, useRef, useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  Percent,
  Megaphone,
  RefreshCw,
  Ticket,
  Truck,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  processIfoodSpreadsheet,
  type IfoodConsolidation,
} from "@/lib/ifood-spreadsheet-processor";

interface IfoodSpreadsheetImportModalProps {
  userId: string;
  storeId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: IfoodConsolidation) => void;
}

type Step = "upload" | "dashboard" | "done";

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
  variant?: "default" | "danger" | "success" | "warning" | "muted";
  className?: string;
}) {
  const variantStyles = {
    default: "bg-card border-border",
    danger: "bg-destructive/5 border-destructive/20",
    success: "bg-green-500/5 border-green-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    muted: "bg-muted/30 border-border",
  };
  const iconColors = {
    default: "text-primary",
    danger: "text-destructive",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
  };

  return (
    <div className={`rounded-xl border p-3 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
        <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
      </div>
      <p className="font-bold text-base font-mono">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-mono font-semibold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1">{sub}</span>}
      </div>
    </div>
  );
}

const DEFAULT_CONSOLIDATION: IfoodConsolidation = {
  mesReferencia: "",
  totalPedidos: 0,
  faturamentoBruto: 0,
  faturamentoLiquido: 0,
  totalCupomLoja: 0,
  totalCupomIfood: 0,
  totalComissao: 0,
  totalTaxa: 0,
  totalAnuncios: 0,
  ticketMedio: 0,
  percentualMedioComissao: 0,
  percentualMedioTaxa: 0,
  percentualRealIfood: 0,
  couponAbsorber: "business",
  couponType: "fixed",
  couponAvgValue: 0,
  ordersWithCoupon: 0,
  ordersWithCouponLojaOnly: 0,
  ordersWithCouponIfoodOnly: 0,
  ordersWithCouponShared: 0,
  ordersWithoutCoupon: 0,
  totalCupomShared: 0,
  ordersWithIfoodDelivery: 0,
  totalDeliveryCost: 0,
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLastImport = useCallback(async () => {
    const { data } = await supabase
      .from("ifood_import_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0];
      setLastImport({
        ...DEFAULT_CONSOLIDATION,
        mesReferencia: row.mes_referencia,
        totalPedidos: row.total_pedidos,
        faturamentoBruto: Number(row.faturamento_bruto),
        faturamentoLiquido: Number(row.faturamento_liquido),
        totalCupomLoja: Number(row.total_cupom_loja),
        totalCupomIfood: Number(row.total_cupom_ifood),
        totalComissao: Number(row.total_comissao),
        totalTaxa: Number(row.total_taxa),
        totalAnuncios: Number(row.total_anuncios),
        ticketMedio: Number(row.ticket_medio),
        percentualMedioComissao: Number(row.percentual_medio_comissao),
        percentualMedioTaxa: Number(row.percentual_medio_taxa),
        percentualRealIfood: Number(row.percentual_real_ifood),
      });
      setLastImportDate(new Date(row.created_at).toLocaleDateString("pt-BR"));
      setStep("dashboard");
    }
  }, [userId]);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setStep("upload");
      setConsolidation(null);
      setError(null);
      setShowTutorial(false);
      loadLastImport();
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
      const { error: insertError } = await supabase
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

      if (insertError) throw insertError;

      onApply(consolidation);
      setLastImport(consolidation);
      setLastImportDate(new Date().toLocaleDateString("pt-BR"));
      setStep("done");
      toast.success("Dados importados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar importação: " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const fmt = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const fmtPct = (value: number) => `${value.toFixed(2)}%`;

  const displayData = consolidation || lastImport;
  const isNewImport = !!consolidation;

  const renderDashboard = (data: IfoodConsolidation) => {
    const totalDescontos = data.totalComissao + data.totalTaxa + data.totalCupomLoja;
    const descontoPercent = data.faturamentoBruto > 0
      ? (totalDescontos / data.faturamentoBruto) * 100
      : 0;
    const lucroLiquidoPercent = data.faturamentoBruto > 0
      ? (data.faturamentoLiquido / data.faturamentoBruto) * 100
      : 0;

    const totalCupons = data.totalCupomLoja + data.totalCupomIfood + data.totalCupomShared;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">
              {isNewImport ? "Nova planilha processada" : "Última importação"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {data.mesReferencia}
            </Badge>
            {!isNewImport && lastImportDate && (
              <Badge variant="secondary" className="text-xs">
                {lastImportDate}
              </Badge>
            )}
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={DollarSign}
            label="Faturamento Bruto"
            value={fmt(data.faturamentoBruto)}
            variant="success"
          />
          <MetricCard
            icon={ShoppingCart}
            label="Total de Pedidos"
            value={data.totalPedidos.toLocaleString("pt-BR")}
            subValue={`Ticket médio: ${fmt(data.ticketMedio)}`}
            variant="default"
          />
        </div>

        {/* Revenue distribution bar */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Distribuição do Faturamento
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                Você recebe
              </span>
              <span className="font-mono font-bold text-green-600 dark:text-green-400">
                {fmtPct(lucroLiquidoPercent)}
              </span>
            </div>
            <Progress
              value={lucroLiquidoPercent}
              className="h-3 bg-destructive/15 [&>div]:bg-green-500"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-destructive inline-block" />
                iFood retém
              </span>
              <span className="font-mono font-bold text-destructive">
                {fmtPct(descontoPercent)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Líquido: <strong className="text-foreground">{fmt(data.faturamentoLiquido)}</strong>
          </p>
        </div>

        {/* Commissions & taxes */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Receipt}
            label="Comissão iFood"
            value={fmt(data.totalComissao)}
            subValue={`Média: ${fmtPct(data.percentualMedioComissao)}`}
            variant="danger"
          />
          <MetricCard
            icon={Percent}
            label="Taxa Transação"
            value={fmt(data.totalTaxa)}
            subValue={`Média: ${fmtPct(data.percentualMedioTaxa)}`}
            variant="danger"
          />
        </div>

        {/* ── COUPON BREAKDOWN ── */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Detalhamento de Cupons
            </p>
          </div>

          <div className="space-y-1">
            <MiniStat
              label="Total de pedidos"
              value={data.totalPedidos}
            />
            <MiniStat
              label="Pedidos COM cupom"
              value={data.ordersWithCoupon}
              sub={data.totalPedidos > 0 ? `(${((data.ordersWithCoupon / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
            />
            <MiniStat
              label="Pedidos SEM cupom"
              value={data.ordersWithoutCoupon}
              sub={data.totalPedidos > 0 ? `(${((data.ordersWithoutCoupon / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
            />
          </div>

          <Separator className="my-2" />

          <p className="text-xs font-medium text-muted-foreground">Quem pagou o cupom:</p>
          <div className="space-y-1">
            <MiniStat
              label="🏪 Só eu paguei"
              value={`${data.ordersWithCouponLojaOnly} pedidos`}
              sub={data.totalCupomLoja > 0 ? `(${fmt(data.totalCupomLoja)})` : ""}
            />
            <MiniStat
              label="🟠 Só o iFood pagou"
              value={`${data.ordersWithCouponIfoodOnly} pedidos`}
              sub={data.totalCupomIfood > 0 ? `(${fmt(data.totalCupomIfood)})` : ""}
            />
            <MiniStat
              label="🤝 Nós dois pagamos"
              value={`${data.ordersWithCouponShared} pedidos`}
              sub={data.totalCupomShared > 0 ? `(${fmt(data.totalCupomShared)})` : ""}
            />
          </div>

          {totalCupons > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-muted-foreground font-medium">Total gasto com cupons</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{fmt(totalCupons)}</span>
              </div>
            </>
          )}
        </div>

        {/* ── DELIVERY BREAKDOWN ── */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Entrega iFood
            </p>
          </div>
          <div className="space-y-1">
            <MiniStat
              label="Pedidos com entrega iFood"
              value={data.ordersWithIfoodDelivery}
              sub={data.totalPedidos > 0 ? `(${((data.ordersWithIfoodDelivery / data.totalPedidos) * 100).toFixed(1)}%)` : ""}
            />
            <MiniStat
              label="Custo total com entrega"
              value={fmt(data.totalDeliveryCost)}
            />
          </div>
          {data.ordersWithIfoodDelivery === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma entrega via iFood detectada neste período.
            </p>
          )}
        </div>

        {/* Ads */}
        {data.totalAnuncios > 0 && (
          <MetricCard
            icon={Megaphone}
            label="Gasto com Anúncios"
            value={fmt(data.totalAnuncios)}
            subValue="Informativo — não entra no plano"
            variant="muted"
          />
        )}

        {/* HIGHLIGHT: Real percentage */}
        <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-center space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Percentual Real Pago ao iFood
          </p>
          <p className="text-3xl font-extrabold font-mono text-destructive">
            {fmtPct(data.percentualRealIfood)}
          </p>
          <p className="text-xs text-muted-foreground">
            (Comissão + Taxa) / Faturamento Bruto
          </p>
        </div>

        {/* Base rate info */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Taxa Base Fixa do Plano iFood
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A taxa base do iFood é fixa: <strong className="text-foreground">12%</strong> (Plano Básico)
            ou <strong className="text-foreground">23%</strong> (Plano Entrega).
            Esse valor não muda e já está incluído no cálculo da comissão acima.
          </p>
        </div>

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
                disabled={isProcessing}
                className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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

          {/* Always show option to upload new spreadsheet */}
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
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-destructive" />
            Raio-X Financeiro iFood
          </DialogTitle>
          <DialogDescription>
            Análise detalhada dos seus dados financeiros do iFood.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload (no previous data) */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-destructive/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                Clique para selecionar a planilha
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Aceita arquivos .xlsx ou .xls
              </p>
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
                <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                <span className="text-sm text-muted-foreground">Processando planilha...</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Tutorial */}
            <div>
              <button
                onClick={() => setShowTutorial(!showTutorial)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-4 w-4" />
                📥 Como baixar a planilha do iFood
                {showTutorial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showTutorial && (
                <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium text-foreground">Passo a passo:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>No Portal do Parceiro iFood, acesse <strong>Relatórios</strong></li>
                    <li>Clique em <strong>Vendas</strong></li>
                    <li>Clique em <strong>Conciliação</strong></li>
                    <li>Selecione o <strong>mês</strong> no canto superior esquerdo</li>
                    <li>Clique em <strong>Exportar</strong></li>
                    <li>Aguarde a notificação verde</li>
                    <li>Vá em <strong>Relatórios → Exportações</strong></li>
                    <li>Clique em <strong>Baixar</strong></li>
                    <li>Envie o arquivo aqui</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP: Dashboard */}
        {step === "dashboard" && displayData && renderDashboard(displayData)}

        {/* Loading overlay for file processing on dashboard */}
        {step === "dashboard" && isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-destructive" />
            <span className="text-sm text-muted-foreground">Processando nova planilha...</span>
          </div>
        )}

        {step === "dashboard" && error && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Dados aplicados com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os campos do Plano iFood foram atualizados com os dados reais da sua planilha.
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
