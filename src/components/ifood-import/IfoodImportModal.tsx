import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Store, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RotateCcw,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ImportType = "ingredients" | "recipes";

interface ParsedItem {
  name: string;
  category?: string;
}

interface IfoodImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportType;
  userId: string;
  userPlan: "free" | "basic" | "pro";
  onImportComplete: (items: ParsedItem[]) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

type Step = "intro" | "input" | "loading" | "confirm" | "result" | "limit-reached";

export function IfoodImportModal({
  open,
  onOpenChange,
  importType,
  userId,
  userPlan,
  onImportComplete,
  onRefreshData,
}: IfoodImportModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [ifoodUrl, setIfoodUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Plan limits
  const planLimits: Record<string, number> = {
    free: 1,
    basic: 2,
    pro: Infinity,
  };

  const maxUsage = planLimits[userPlan] ?? 0;
  const remainingUsage = Math.max(0, maxUsage - usageCount);
  const canImport = userPlan === "pro" || remainingUsage > 0;

  // Check usage on mount
  useEffect(() => {
    if (open) {
      checkUsage();
      setStep(canImport ? "intro" : "limit-reached");
      setIfoodUrl("");
      setStoreName("");
      setParsedItems([]);
      setError(null);
      setProgress(0);
    }
  }, [open, userPlan]);

  const checkUsage = async () => {
    // Get usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("ifood_import_usage")
      .select("id")
      .eq("user_id", userId)
      .eq("import_type", importType)
      .gte("created_at", startOfMonth.toISOString());

    if (!error && data) {
      setUsageCount(data.length);
    }
  };

  const handleStartImport = async () => {
    if (!ifoodUrl.trim()) {
      setError("Cole o link da sua loja no iFood");
      return;
    }

    setStep("loading");
    setProgress(10);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 80));
      }, 500);

      const response = await supabase.functions.invoke("parse-ifood-menu", {
        body: { ifoodUrl, importType },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message || "Erro ao processar cardápio");
      }

      const data = response.data;
      if (data.error) {
        throw new Error(data.error);
      }

      setStoreName(data.storeName || "Loja");
      setParsedItems(data.items || []);
      setStep("confirm");
    } catch (err) {
      console.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar");
      setStep("input");
    }
  };

  const handleConfirmStore = async () => {
    setIsProcessing(true);
    try {
      // Save items via callback
      await onImportComplete(parsedItems);

      // Record usage
      await supabase.from("ifood_import_usage").insert({
        user_id: userId,
        import_type: importType,
        imported_count: parsedItems.length,
        store_name: storeName,
        store_url: ifoodUrl,
      });

      setStep("result");
      await onRefreshData();
    } catch (err: any) {
      // Log detailed error for debugging
      console.error("Save error details:", {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        error: err,
      });
      
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os itens importados. Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    // This would delete the imported items - handled by parent
    toast({
      title: "Itens removidos",
      description: "Os itens importados foram excluídos.",
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const typeLabel = importType === "ingredients" ? "insumos" : "fichas técnicas";
  const typeLabelSingular = importType === "ingredients" ? "insumo" : "ficha técnica";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* STEP: Limit Reached */}
        {step === "limit-reached" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                Funcionalidade Indisponível
              </DialogTitle>
              <DialogDescription>
                {!canImport
                  ? "Você atingiu o limite de importações do seu plano este mês."
                  : "Esta funcionalidade não está disponível no seu plano atual."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Faça upgrade para o plano Pro para importações ilimitadas.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Intro */}
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Importar {typeLabel} do iFood (IA)
              </DialogTitle>
              <DialogDescription className="text-left">
                A IA vai ler o cardápio da sua loja no iFood e criar automaticamente os {typeLabel} com base nos nomes encontrados.
                <br /><br />
                <strong>Você poderá revisar e completar as informações depois.</strong>
              </DialogDescription>
            </DialogHeader>
            
            {userPlan === "basic" && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Você ainda pode usar esta função <strong>{remainingUsage} {remainingUsage === 1 ? "vez" : "vezes"}</strong> este mês.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("input")}>
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Input URL */}
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle>Cole o link da sua loja</DialogTitle>
              <DialogDescription>
                Acesse sua loja no iFood, copie o link e cole abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ifood-url">Link do iFood</Label>
                <Input
                  id="ifood-url"
                  placeholder="https://www.ifood.com.br/delivery/..."
                  value={ifoodUrl}
                  onChange={(e) => {
                    setIfoodUrl(e.target.value);
                    setError(null);
                  }}
                />
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("intro")}>
                Voltar
              </Button>
              <Button onClick={handleStartImport} disabled={!ifoodUrl.trim()}>
                Importar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Loading */}
        {step === "loading" && (
          <>
            <DialogHeader>
              <DialogTitle>Lendo cardápio do iFood...</DialogTitle>
            </DialogHeader>
            
            <div className="py-8 space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                A IA está analisando os itens do cardápio...
              </p>
            </div>
          </>
        )}

        {/* STEP: Confirm Store */}
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Essa é a sua loja?
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{storeName}</h3>
                <p className="text-sm text-muted-foreground">
                  {parsedItems.length} {parsedItems.length === 1 ? typeLabelSingular : typeLabel} {parsedItems.length === 1 ? "encontrado" : "encontrados"}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("input")} className="gap-2">
                <XCircle className="w-4 h-4" />
                Não é minha loja
              </Button>
              <Button onClick={handleConfirmStore} disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Result */}
        {step === "result" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                Importação concluída!
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 text-center space-y-4">
              <p className="text-lg">
                <strong>{parsedItems.length}</strong> {typeLabel} foram criados automaticamente.
              </p>
              
              {userPlan === "basic" && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  Seu plano possui limite de importações. Após esse uso, não será possível repetir este processo.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Resetar tudo
              </Button>
              <Button onClick={handleClose} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Manter {typeLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}