import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HardDrive, Download, Upload, FileCheck, AlertTriangle, Shield, Check,
  ArrowLeft, Package, FileSpreadsheet, Wine, Sparkles, DollarSign, Building2,
  ChevronRight, Loader2, X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBackupRestore } from "@/hooks/useBackupRestore";
import { useStore } from "@/contexts/StoreContext";
import { ConfirmationInput } from "@/components/security/ConfirmationInput";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LABEL_MAP: Record<string, { label: string; icon: typeof Package }> = {
  stores: { label: "Lojas", icon: Building2 },
  sharing_groups: { label: "Grupos de Compartilhamento", icon: Building2 },
  ingredients: { label: "Insumos", icon: Package },
  recipes: { label: "Fichas Técnicas", icon: FileSpreadsheet },
  recipe_ingredients: { label: "Ingredientes de Receitas", icon: FileSpreadsheet },
  sub_recipes: { label: "Sub-receitas", icon: FileSpreadsheet },
  sub_recipe_ingredients: { label: "Ingredientes de Sub-receitas", icon: FileSpreadsheet },
  beverages: { label: "Bebidas", icon: Wine },
  combos: { label: "Combos", icon: Sparkles },
  combo_items: { label: "Itens de Combos", icon: Sparkles },
  fixed_costs: { label: "Custos Fixos", icon: DollarSign },
  variable_costs: { label: "Custos Variáveis", icon: DollarSign },
  fixed_expenses: { label: "Despesas Fixas", icon: Building2 },
  variable_expenses: { label: "Despesas Variáveis", icon: Building2 },
  business_taxes: { label: "Impostos", icon: DollarSign },
  card_fees: { label: "Taxas de Cartão", icon: DollarSign },
  monthly_revenues: { label: "Faturamento Mensal", icon: DollarSign },
  cmv_periodos: { label: "Períodos CMV", icon: DollarSign },
  cmv_categorias: { label: "Categorias CMV", icon: DollarSign },
  cost_allocations: { label: "Alocações de Custos", icon: DollarSign },
  topo_cardapio_simulacoes: { label: "Simulações de Cardápio", icon: Sparkles },
};

export default function BackupRestore() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const {
    isExporting, isImporting, isPreviewing, preview, exportBackup,
    previewImport, executeImport, clearPreview,
  } = useBackupRestore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerCount, setTimerCount] = useState(3);
  const [dragOver, setDragOver] = useState(false);

  // Timer for confirmation button
  useEffect(() => {
    if (!timerActive) return;
    if (timerCount <= 0) { setTimerActive(false); return; }
    const t = setTimeout(() => setTimerCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [timerActive, timerCount]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".precify-backup") && !file.name.endsWith(".json")) {
        return;
      }
      previewImport(file);
    },
    [previewImport]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleConfirmImport = () => {
    if (importMode === "replace") {
      setShowConfirm(true);
      setConfirmed(false);
      setTimerCount(3);
      setTimerActive(true);
    } else {
      executeImport("merge");
    }
  };

  const handleExecuteReplace = () => {
    setShowConfirm(false);
    executeImport("replace");
  };

  const totalItems = preview
    ? Object.values(preview.counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Backup & Restauração</h1>
                <p className="text-sm text-muted-foreground">Exporte ou importe seus dados com segurança</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* EXPORT SECTION */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Exportar Dados</CardTitle>
                <CardDescription>
                  Baixe uma cópia de todos os seus dados cadastrados no sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Seus dados são exportados em formato seguro e criptografado
              </p>
              <p className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Inclui: insumos, receitas, bebidas, custos, despesas e configurações
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-warning flex-shrink-0" />
                Valores calculados (preço sugerido, CMV, etc.) não são exportados — serão recalculados
              </p>
            </div>

            <Button
              onClick={() => exportBackup(activeStore?.id)}
              disabled={isExporting}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Fazer backup dos meus dados
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* IMPORT SECTION */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Restaurar Dados</CardTitle>
                <CardDescription>
                  Importe um backup previamente exportado pelo sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload area */}
            {!preview && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".precify-backup,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {isPreviewing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Validando arquivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Arraste o arquivo aqui ou clique para selecionar</p>
                      <p className="text-sm text-muted-foreground mt-1">Aceita arquivos .precify-backup ou .json</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-foreground">Arquivo válido</p>
                      <p className="text-sm text-muted-foreground">
                        Exportado em {new Date(preview.exported_at).toLocaleString("pt-BR")}
                        {preview.store_name && ` • Loja: ${preview.store_name}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearPreview}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Item counts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(preview.counts)
                    .filter(([, count]) => count > 0)
                    .map(([key, count]) => {
                      const meta = LABEL_MAP[key];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <div key={key} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">{meta.label}</span>
                          <Badge variant="secondary" className="ml-auto">{count}</Badge>
                        </div>
                      );
                    })}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  Os dados calculados (preços sugeridos, CMV, etc.) serão recalculados automaticamente após a importação.
                </div>

                {/* Mode selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Como deseja importar?</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setImportMode("merge")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        importMode === "merge"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-foreground">Adicionar sem sobrescrever</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Insere apenas itens novos. Dados existentes não são alterados.
                      </p>
                    </button>
                    <button
                      onClick={() => setImportMode("replace")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        importMode === "replace"
                          ? "border-destructive bg-destructive/5"
                          : "border-border hover:border-destructive/50"
                      }`}
                    >
                      <p className="font-medium text-foreground">Substituir tudo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Apaga todos os dados atuais e insere os do backup.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Action button */}
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  variant={importMode === "replace" ? "destructive" : "default"}
                  className="w-full"
                  size="lg"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando {totalItems} itens...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {importMode === "replace"
                        ? `Substituir tudo (${totalItems} itens)`
                        : `Adicionar novos itens (${totalItems} itens)`}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Replace Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Substituir todos os dados?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação irá <strong>apagar permanentemente</strong> todos os seus dados atuais
                (insumos, receitas, bebidas, custos, despesas) e substituí-los pelos dados do backup.
              </p>
              <p className="text-destructive font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ConfirmationInput
            expectedValue="RESTAURAR"
            label="Digite RESTAURAR para confirmar"
            onMatch={setConfirmed}
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleExecuteReplace}
              disabled={!confirmed || timerCount > 0}
            >
              {timerCount > 0
                ? `Aguarde ${timerCount}s...`
                : "Confirmar substituição"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
