import { useState, useCallback, useRef } from "react";
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
  X,
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

type Step = "upload" | "summary" | "done";

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
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [canImport, setCanImport] = useState<boolean | null>(null);
  const [alreadyImportedMonth, setAlreadyImportedMonth] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkCanImport = useCallback(async () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data } = await supabase
      .from("ifood_import_logs")
      .select("id, mes_referencia")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      // Check if any import was done in the current calendar month
      const { data: thisMonth } = await supabase
        .from("ifood_import_logs")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", `${currentMonth}-01T00:00:00Z`)
        .limit(1);

      if (thisMonth && thisMonth.length > 0) {
        setCanImport(false);
        setAlreadyImportedMonth(currentMonth);
        return;
      }
    }
    setCanImport(true);
  }, [userId]);

  // Check on open
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setStep("upload");
      setConsolidation(null);
      setError(null);
      setShowTutorial(false);
      checkCanImport();
    }
    onOpenChange(v);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
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
      setStep("summary");
    } catch (err: any) {
      setError(err.message || "Erro ao processar planilha.");
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!consolidation) return;

    setIsProcessing(true);
    try {
      // Save log
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

      // Apply to plan
      onApply(consolidation);
      setStep("done");
      toast.success("Dados importados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar importação: " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-destructive" />
            Importar Planilha de Conciliação iFood
          </DialogTitle>
          <DialogDescription>
            Faça upload da planilha oficial de conciliação do iFood para preencher
            automaticamente os dados do seu plano.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {canImport === false && (
              <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    Você já utilizou essa importação neste mês.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limite: 1 importação por mês. Tente novamente no próximo mês.
                  </p>
                </div>
              </div>
            )}

            {canImport !== false && (
              <>
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-destructive/50 transition-colors"
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
              </>
            )}

            {/* Tutorial */}
            <div>
              <button
                onClick={() => setShowTutorial(!showTutorial)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-4 w-4" />
                📥 Como baixar a planilha do iFood
                {showTutorial ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
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

        {/* STEP: Summary */}
        {step === "summary" && consolidation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">
                Planilha processada com sucesso!
              </span>
              <Badge variant="outline" className="text-xs">
                {consolidation.mesReferencia}
              </Badge>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <p className="font-semibold text-foreground flex items-center gap-2">
                📊 Raio-X Financeiro do seu iFood
              </p>
              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Faturamento bruto</span>
                  <p className="font-mono font-semibold">{formatCurrency(consolidation.faturamentoBruto)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total de pedidos</span>
                  <p className="font-mono font-semibold">{consolidation.totalPedidos}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ticket médio</span>
                  <p className="font-mono font-semibold">{formatCurrency(consolidation.ticketMedio)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Faturamento líquido</span>
                  <p className="font-mono font-semibold">{formatCurrency(consolidation.faturamentoLiquido)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Cupom pago pela loja</span>
                  <p className="font-mono font-semibold text-destructive">
                    {formatCurrency(consolidation.totalCupomLoja)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cupom pago pelo iFood</span>
                  <p className="font-mono font-semibold text-green-600">
                    {formatCurrency(consolidation.totalCupomIfood)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total comissão</span>
                  <p className="font-mono font-semibold text-destructive">
                    {formatCurrency(consolidation.totalComissao)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total taxa transação</span>
                  <p className="font-mono font-semibold text-destructive">
                    {formatCurrency(consolidation.totalTaxa)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total anúncios</span>
                  <p className="font-mono font-semibold text-muted-foreground">
                    {formatCurrency(consolidation.totalAnuncios)}
                  </p>
                  <span className="text-xs text-muted-foreground italic">informativo</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">% Real pago ao iFood</span>
                  <p className="font-mono text-lg font-bold text-destructive">
                    {formatPercent(consolidation.percentualRealIfood)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isProcessing}>
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
                Aplicar automaticamente ao Plano
              </Button>
            </DialogFooter>
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
