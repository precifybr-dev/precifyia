import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Clipboard,
  ArrowRight,
  Edit2,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParsedIngredient {
  name: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  correction_factor: number;
  status: "valid" | "duplicate" | "error" | "removed";
  errorMessage?: string;
  duplicateAction?: "rename" | "skip";
  newName?: string;
  isEditing?: boolean;
}

interface ColumnMapping {
  name: number | null;
  price: number | null;
  quantity: number | null;
  unit: number | null;
  correction_factor: number | null;
}

interface SpreadsheetImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  storeId: string | null;
  existingIngredients: { name: string }[];
  onImportComplete: () => Promise<void>;
}

type Step = "input" | "analyzing" | "mapping" | "confirm" | "importing" | "result";

const UNIT_MAPPINGS: Record<string, string> = {
  "kg": "kg",
  "kilo": "kg",
  "quilograma": "kg",
  "quilogramas": "kg",
  "g": "g",
  "gr": "g",
  "grama": "g",
  "gramas": "g",
  "l": "l",
  "litro": "l",
  "litros": "l",
  "ml": "ml",
  "mililitro": "ml",
  "mililitros": "ml",
  "un": "un",
  "und": "un",
  "unidade": "un",
  "unidades": "un",
  "dz": "dz",
  "duzia": "dz",
  "dúzia": "dz",
};

const FIELD_OPTIONS = [
  { value: "name", label: "Nome do Insumo" },
  { value: "price", label: "Preço Total (R$)" },
  { value: "quantity", label: "Quantidade" },
  { value: "unit", label: "Unidade" },
  { value: "correction_factor", label: "Fator de Correção" },
  { value: "ignore", label: "Ignorar" },
];

export function SpreadsheetImportModal({
  open,
  onOpenChange,
  userId,
  storeId,
  existingIngredients,
  onImportComplete,
}: SpreadsheetImportModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [rawData, setRawData] = useState("");
  const [progress, setProgress] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: null,
    price: null,
    quantity: null,
    unit: null,
    correction_factor: null,
  });
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setStep("input");
    setRawData("");
    setProgress(0);
    setHeaders([]);
    setRows([]);
    setColumnMapping({
      name: null,
      price: null,
      quantity: null,
      unit: null,
      correction_factor: null,
    });
    setParsedIngredients([]);
    setImportResult({ success: 0, errors: 0 });
    setDeleteExisting(false);
    setShowDeleteConfirm(false);
  };

  const parseSpreadsheetData = (data: string) => {
    const lines = data.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("A planilha precisa ter pelo menos um cabeçalho e uma linha de dados.");
    }

    const parsedHeaders = lines[0].split("\t").map(h => h.trim());
    const parsedRows = lines.slice(1).map(line => 
      line.split("\t").map(cell => cell.trim())
    ).filter(row => row.some(cell => cell !== ""));

    return { headers: parsedHeaders, rows: parsedRows };
  };

  const intelligentColumnMapping = async (headers: string[]) => {
    setStep("analyzing");
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 80));
      }, 300);

      const response = await supabase.functions.invoke("analyze-spreadsheet-columns", {
        body: { headers },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message || "Erro ao analisar colunas");
      }

      const mapping = response.data?.mapping;
      if (mapping) {
        setColumnMapping(mapping);
      }

      setStep("mapping");
    } catch (err) {
      console.error("AI mapping error:", err);
      // Fallback to basic mapping
      const basicMapping = guessBasicMapping(headers);
      setColumnMapping(basicMapping);
      setStep("mapping");
    }
  };

  const guessBasicMapping = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      name: null,
      price: null,
      quantity: null,
      unit: null,
      correction_factor: null,
    };

    const nameKeywords = ["nome", "produto", "insumo", "descrição", "matéria", "item", "ingrediente"];
    const priceKeywords = ["preço", "preco", "valor", "custo", "r$", "total"];
    const quantityKeywords = ["quantidade", "qtd", "qtde", "volume", "peso", "embalagem"];
    const unitKeywords = ["unidade", "un", "medida", "und"];
    const fcKeywords = ["fc", "f.c", "fator", "correção", "correcao", "perda"];

    headers.forEach((header, index) => {
      const h = header.toLowerCase();
      
      if (mapping.name === null && nameKeywords.some(k => h.includes(k))) {
        mapping.name = index;
      }
      if (mapping.price === null && priceKeywords.some(k => h.includes(k))) {
        mapping.price = index;
      }
      if (mapping.quantity === null && quantityKeywords.some(k => h.includes(k))) {
        mapping.quantity = index;
      }
      if (mapping.unit === null && unitKeywords.some(k => h.includes(k))) {
        mapping.unit = index;
      }
      if (mapping.correction_factor === null && fcKeywords.some(k => h.includes(k))) {
        mapping.correction_factor = index;
      }
    });

    return mapping;
  };

  const handleAnalyze = async () => {
    if (!rawData.trim()) {
      toast({
        title: "Dados vazios",
        description: "Cole os dados da sua planilha para continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { headers: parsedHeaders, rows: parsedRows } = parseSpreadsheetData(rawData);
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      await intelligentColumnMapping(parsedHeaders);
    } catch (err) {
      toast({
        title: "Erro ao analisar",
        description: err instanceof Error ? err.message : "Formato inválido",
        variant: "destructive",
      });
    }
  };

  const normalizeUnit = (unit: string): string => {
    const normalized = unit.toLowerCase().trim();
    return UNIT_MAPPINGS[normalized] || "un";
  };

  const parsePrice = (value: string): number => {
    if (!value) return 0;
    // Remove R$, spaces, and handle both , and . as decimal separators
    let cleaned = value.replace(/[R$\s]/g, "").trim();
    
    // If has both . and ,, the last one is the decimal separator
    if (cleaned.includes(".") && cleaned.includes(",")) {
      if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
        // 1.000,00 format
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        // 1,000.00 format
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      // Only comma - treat as decimal separator
      cleaned = cleaned.replace(",", ".");
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseQuantity = (value: string): number => {
    if (!value) return 1;
    const cleaned = value.replace(",", ".").replace(/[^\d.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? 1 : num;
  };

  const handleConfirmMapping = () => {
    if (columnMapping.name === null) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a coluna do Nome do Insumo.",
        variant: "destructive",
      });
      return;
    }

    const existingNames = new Set(
      existingIngredients.map(i => i.name.toLowerCase().trim())
    );

    const ingredients: ParsedIngredient[] = rows.map(row => {
      const name = row[columnMapping.name!]?.trim() || "";
      const priceValue = columnMapping.price !== null ? row[columnMapping.price] : "";
      const quantityValue = columnMapping.quantity !== null ? row[columnMapping.quantity] : "1";
      const unitValue = columnMapping.unit !== null ? row[columnMapping.unit] : "un";
      const fcValue = columnMapping.correction_factor !== null ? row[columnMapping.correction_factor] : "1";

      const quantity = parseQuantity(quantityValue);
      const totalPrice = parsePrice(priceValue);
      const correctionFactor = parseQuantity(fcValue) || 1;
      const unit = normalizeUnit(unitValue);

      // Calculate unit price
      const unitPrice = quantity > 0 ? (totalPrice / quantity) * correctionFactor : 0;

      let status: "valid" | "duplicate" | "error" = "valid";
      let errorMessage = "";

      if (!name) {
        status = "error";
        errorMessage = "Nome do insumo não encontrado";
      } else if (existingNames.has(name.toLowerCase())) {
        status = "duplicate";
        errorMessage = `O insumo "${name}" já existe no seu cadastro`;
      }

      return {
        name,
        unit,
        purchase_quantity: quantity,
        purchase_price: totalPrice,
        correction_factor: correctionFactor,
        status,
        errorMessage,
        duplicateAction: status === "duplicate" ? "skip" : undefined,
      };
    });

    setParsedIngredients(ingredients);
    setStep("confirm");
  };

  const handleDuplicateAction = (index: number, action: "rename" | "skip") => {
    setParsedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        duplicateAction: action,
        status: action === "skip" ? "duplicate" : "valid",
      };
      return updated;
    });
  };

  const handleRename = (index: number, newName: string) => {
    setParsedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        newName,
        status: "valid",
        errorMessage: undefined,
        duplicateAction: "rename",
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setParsedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: "removed",
      };
      return updated;
    });
  };

  const handleToggleEdit = (index: number) => {
    setParsedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isEditing: !updated[index].isEditing,
        newName: updated[index].newName || updated[index].name,
      };
      return updated;
    });
  };

  const handleImportClick = () => {
    if (deleteExisting && existingIngredients.length > 0) {
      setShowDeleteConfirm(true);
    } else {
      handleImport();
    }
  };

  const handleConfirmDeleteAndImport = async () => {
    setShowDeleteConfirm(false);
    await handleImport(true);
  };

  const handleImport = async (shouldDeleteExisting = false) => {
    setStep("importing");
    setProgress(0);

    const toImport = parsedIngredients.filter(
      ing => (ing.status === "valid" || (shouldDeleteExisting && ing.status === "duplicate")) 
        && ing.duplicateAction !== "skip" 
        && (ing.newName || ing.name)
    );

    if (toImport.length === 0) {
      toast({
        title: "Nenhum item para importar",
        description: "Todos os itens foram ignorados ou têm erros.",
        variant: "destructive",
      });
      setStep("confirm");
      return;
    }

    try {
      // If delete existing is checked, delete all current ingredients first
      if (shouldDeleteExisting) {
        setProgress(5);
        
        // Delete all recipe_ingredients linked to the user's ingredients
        const { data: userIngredients } = await supabase
          .from("ingredients")
          .select("id")
          .eq("user_id", userId);
        
        if (userIngredients && userIngredients.length > 0) {
          const ingredientIds = userIngredients.map(i => i.id);
          
          // Delete from recipe_ingredients
          await supabase
            .from("recipe_ingredients")
            .delete()
            .in("ingredient_id", ingredientIds);
          
          // Delete from sub_recipe_ingredients
          await supabase
            .from("sub_recipe_ingredients")
            .delete()
            .in("ingredient_id", ingredientIds);
          
          // Delete all ingredients
          await supabase
            .from("ingredients")
            .delete()
            .eq("user_id", userId);
        }
        
        setProgress(15);
      }

      // Start code from 1 if deleting all, otherwise get max
      let startCode = 1;
      if (!shouldDeleteExisting) {
        const { data: maxCodeData } = await supabase
          .from("ingredients")
          .select("code")
          .eq("user_id", userId)
          .order("code", { ascending: false })
          .limit(1);
        
        startCode = maxCodeData && maxCodeData.length > 0 ? maxCodeData[0].code + 1 : 1;
      }

      const baseProgress = shouldDeleteExisting ? 15 : 0;
      const progressIncrement = (90 - baseProgress) / toImport.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < toImport.length; i++) {
        const ing = toImport[i];
        
        const { error } = await supabase.from("ingredients").insert({
          user_id: userId,
          store_id: storeId,
          code: startCode + i,
          name: ing.newName || ing.name,
          unit: ing.unit,
          purchase_quantity: ing.purchase_quantity,
          purchase_price: ing.purchase_price,
          correction_factor: ing.correction_factor,
          color: null,
        });

        if (error) {
          console.error("Insert error:", error);
          errorCount++;
        } else {
          successCount++;
        }

        setProgress(Math.min(baseProgress + (i + 1) * progressIncrement, 95));
      }

      // Record usage
      await supabase.from("ifood_import_usage").insert({
        user_id: userId,
        import_type: "ingredients",
        imported_count: successCount,
        store_name: "Planilha",
        store_url: null,
      });

      setProgress(100);
      setImportResult({ success: successCount, errors: errorCount });
      setStep("result");
      await onImportComplete();
    } catch (err) {
      console.error("Import error:", err);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os insumos.",
        variant: "destructive",
      });
      setStep("confirm");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const validCount = parsedIngredients.filter(i => i.status === "valid" && i.duplicateAction !== "skip").length;
  const duplicateCount = parsedIngredients.filter(i => i.status === "duplicate" && i.duplicateAction !== "skip").length;
  const errorCount = parsedIngredients.filter(i => i.status === "error").length;
  const removedCount = parsedIngredients.filter(i => i.status === "removed" || i.duplicateAction === "skip").length;
  const activeIngredients = parsedIngredients.filter(i => i.status !== "removed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        {/* STEP: Input */}
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Importar Insumos da Planilha (IA)
              </DialogTitle>
              <DialogDescription className="text-left">
                Importe seus insumos de uma planilha Excel ou Google Sheets de forma rápida e inteligente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Mini tutorial */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Como importar:</p>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    Abra sua planilha (Excel ou Google Sheets)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    Selecione as colunas com cabeçalho (incluindo a linha do título)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">3</span>
                    Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">CTRL + C</kbd>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">4</span>
                    Cole abaixo com <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">CTRL + V</kbd>
                  </li>
                </ol>
              </div>

              <Textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder="Cole aqui os dados da sua planilha (Excel ou Google Sheets)"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze} disabled={!rawData.trim()} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Analisar Planilha
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Analyzing */}
        {step === "analyzing" && (
          <>
            <DialogHeader>
              <DialogTitle>Analisando planilha...</DialogTitle>
            </DialogHeader>
            
            <div className="py-8 space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                A IA está identificando as colunas da sua planilha...
              </p>
            </div>
          </>
        )}

        {/* STEP: Mapping */}
        {step === "mapping" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clipboard className="w-5 h-5" />
                Mapeamento de Colunas
              </DialogTitle>
              <DialogDescription>
                Verifique se as colunas foram identificadas corretamente. Você pode ajustar se necessário.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3 py-4">
                {headers.map((header, index) => {
                  const currentField = 
                    columnMapping.name === index ? "name" :
                    columnMapping.price === index ? "price" :
                    columnMapping.quantity === index ? "quantity" :
                    columnMapping.unit === index ? "unit" :
                    columnMapping.correction_factor === index ? "correction_factor" :
                    "ignore";

                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1 bg-muted/50 rounded px-3 py-2 text-sm font-medium truncate">
                        {header}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Select
                        value={currentField}
                        onValueChange={(value) => {
                          setColumnMapping(prev => {
                            const updated = { ...prev };
                            // Remove this index from any existing mapping
                            Object.keys(updated).forEach(key => {
                              if (updated[key as keyof ColumnMapping] === index) {
                                updated[key as keyof ColumnMapping] = null;
                              }
                            });
                            // Set new mapping
                            if (value !== "ignore") {
                              updated[value as keyof ColumnMapping] = index;
                            }
                            return updated;
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
              <strong>{rows.length}</strong> linhas de dados encontradas
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("input")}>
                Voltar
              </Button>
              <Button onClick={handleConfirmMapping} className="gap-2">
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Confirm */}
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Importação</DialogTitle>
              <DialogDescription>
                Revise os itens antes de importar. Use os botões para editar ou excluir.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-wrap gap-2 py-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3 text-success" />
                {validCount} válidos
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                  <AlertTriangle className="w-3 h-3" />
                  {duplicateCount} duplicados
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                  <XCircle className="w-3 h-3" />
                  {errorCount} com erro
                </Badge>
              )}
              {removedCount > 0 && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Trash2 className="w-3 h-3" />
                  {removedCount} excluídos
                </Badge>
              )}
            </div>

            {/* Delete existing checkbox */}
            {existingIngredients.length > 0 && (
              <div className="flex items-start space-x-2 py-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <Checkbox
                  id="delete-existing"
                  checked={deleteExisting}
                  onCheckedChange={(checked) => setDeleteExisting(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="delete-existing"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Apagar todos os {existingIngredients.length} insumos já cadastrados
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Todos os seus insumos atuais serão excluídos e substituídos pelos da planilha
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-[350px]">
                <div className="space-y-2 pr-4">
                  {activeIngredients.map((ing, originalIndex) => {
                    const index = parsedIngredients.indexOf(ing);
                    const isSkipped = ing.duplicateAction === "skip";
                    
                    return (
                      <div 
                        key={index} 
                        className={`rounded-lg border p-3 ${
                          isSkipped ? "opacity-50 border-muted" :
                          ing.status === "duplicate" ? "border-warning/50 bg-warning/5" :
                          ing.status === "error" ? "border-destructive/50 bg-destructive/5" :
                          "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Status icon */}
                          <div className="shrink-0">
                            {ing.status === "valid" && !isSkipped && (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            )}
                            {ing.status === "duplicate" && !isSkipped && (
                              <AlertTriangle className="w-5 h-5 text-warning" />
                            )}
                            {ing.status === "error" && (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                            {isSkipped && (
                              <XCircle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Content - editable or display */}
                          <div className="flex-1 min-w-0">
                            {ing.isEditing ? (
                              <Input
                                value={ing.newName || ing.name}
                                onChange={(e) => handleRename(index, e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleToggleEdit(index);
                                  }
                                }}
                              />
                            ) : (
                              <>
                                <p className={`font-medium truncate ${isSkipped ? "line-through" : ""}`}>
                                  {ing.newName || ing.name || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ing.purchase_quantity} {ing.unit} • R$ {ing.purchase_price.toFixed(2)}
                                  {ing.correction_factor !== 1 && ` • FC: ${ing.correction_factor}`}
                                </p>
                              </>
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          {!isSkipped && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleToggleEdit(index)}
                                title={ing.isEditing ? "Salvar" : "Editar nome"}
                              >
                                {ing.isEditing ? (
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                ) : (
                                  <Edit2 className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(index)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Error message */}
                        {ing.status === "error" && ing.errorMessage && (
                          <p className="text-sm text-destructive mt-2">{ing.errorMessage}</p>
                        )}
                        
                        {/* Duplicate warning with actions */}
                        {ing.status === "duplicate" && !isSkipped && !ing.isEditing && (
                          <div className="mt-2 pt-2 border-t border-border space-y-2">
                            <p className="text-sm text-warning">{ing.errorMessage}</p>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDuplicateAction(index, "skip")}
                              >
                                Ignorar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="gap-1"
                                onClick={() => handleToggleEdit(index)}
                              >
                                <Edit2 className="w-3 h-3" />
                                Renomear
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Skipped indicator */}
                        {isSkipped && (
                          <p className="text-sm text-muted-foreground italic mt-1">Este item será ignorado</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Voltar
              </Button>
              <Button 
                onClick={handleImportClick} 
                disabled={validCount === 0 && !deleteExisting} 
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Importar {deleteExisting ? parsedIngredients.filter(i => i.status !== "removed" && i.status !== "error").length : validCount} insumos
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Alert Dialog for delete confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Atenção: Exclusão de Dados
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Você está prestes a <strong>excluir permanentemente todos os {existingIngredients.length} insumos</strong> já cadastrados no seu sistema.
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive">
                    Esta ação não pode ser desfeita!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Todos os insumos existentes e seus vínculos com fichas técnicas serão removidos.
                  </p>
                </div>
                <p>
                  Após a exclusão, os novos insumos da planilha serão importados.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteAndImport}
                className="bg-destructive hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir e Importar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* STEP: Importing */}
        {step === "importing" && (
          <>
            <DialogHeader>
              <DialogTitle>Importando insumos...</DialogTitle>
            </DialogHeader>
            
            <div className="py-8 space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Salvando insumos no seu cadastro...
              </p>
            </div>
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
              <div className="space-y-2">
                <p className="text-lg">
                  <strong>{importResult.success}</strong> insumos importados com sucesso
                </p>
                {importResult.errors > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {importResult.errors} itens não puderam ser importados
                  </p>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Complete as informações de cada insumo conforme necessário.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
