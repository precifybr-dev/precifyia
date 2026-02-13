import { useState, useEffect } from "react";
import { Package, Plus, Trash2, AlertCircle, Pencil, X, Check, Loader2, ClipboardCopy, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpreadsheetImportModal } from "@/components/spreadsheet-import/SpreadsheetImportModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";


interface IngredientsStepProps {
  onAdvance: () => Promise<void>;
}

interface Ingredient {
  id: string;
  code: number;
  name: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  unit_price: number;
  correction_factor: number;
}

interface NewIngredient {
  name: string;
  unit: string;
  purchase_quantity: string;
  purchase_price: string;
  correction_factor: string;
}

const units = [
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "un", label: "Unidade (un)" },
  { value: "dz", label: "Dúzia (dz)" },
];

const emptyIngredient: NewIngredient = {
  name: "",
  unit: "kg",
  purchase_quantity: "",
  purchase_price: "",
  correction_factor: "1",
};

export function IngredientsStep({ onAdvance }: IngredientsStepProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState<NewIngredient>(emptyIngredient);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewIngredient>(emptyIngredient);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);

  // Fetch ingredients and default store on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Busca a loja padrão do usuário (criada no passo anterior)
      const { data: storeData } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      
      if (storeData) {
        setDefaultStoreId(storeData.id);
      }

      // Busca ingredientes (todos do usuário, pois pode ter da loja ou sem loja)
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("user_id", user.id)
        .order("code", { ascending: true });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar insumos",
        description: "Não foi possível carregar seus insumos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: buscar próximo código global do usuário (não por loja)
  const getNextCode = async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from("ingredients")
      .select("code")
      .eq("user_id", userId)
      .order("code", { ascending: false })
      .limit(1);
    
    return (data && data.length > 0 ? data[0].code : 0) + 1;
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do insumo.",
        variant: "destructive",
      });
      return;
    }

    const purchaseQty = parseFloat(newIngredient.purchase_quantity) || 0;
    const purchasePrice = parseFloat(newIngredient.purchase_price) || 0;

    if (purchaseQty <= 0 || purchasePrice <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Quantidade e custo devem ser maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular próximo código global para o usuário
      const nextCode = await getNextCode(user.id);

      const ingredientData = {
        user_id: user.id,
        store_id: defaultStoreId, // Associa à loja padrão criada no passo anterior
        code: nextCode,
        name: newIngredient.name.trim(),
        unit: newIngredient.unit,
        purchase_quantity: purchaseQty,
        purchase_price: purchasePrice,
        correction_factor: parseFloat(newIngredient.correction_factor) || 1,
      };

      let { data, error } = await supabase
        .from("ingredients")
        .insert(ingredientData)
        .select()
        .single();

      // Retry automático em caso de colisão de código
      if (error && (error.code === "23505" || error.message?.includes("duplicate key"))) {
        console.warn("Colisão de código detectada, recalculando...");
        const freshCode = await getNextCode(user.id);
        const retryResult = await supabase
          .from("ingredients")
          .insert({ ...ingredientData, code: freshCode })
          .select()
          .single();
        
        if (retryResult.error) throw retryResult.error;
        data = retryResult.data;
        error = null;
      }

      if (error) throw error;

      setIngredients([...ingredients, data!]);
      setNewIngredient(emptyIngredient);
      
      toast({
        title: "Insumo adicionado! ✓",
        description: `${data!.name} foi cadastrado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error adding ingredient:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Não foi possível adicionar o insumo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setEditForm({
      name: ingredient.name,
      unit: ingredient.unit,
      purchase_quantity: ingredient.purchase_quantity.toString(),
      purchase_price: ingredient.purchase_price.toString(),
      correction_factor: ingredient.correction_factor.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyIngredient);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do insumo.",
        variant: "destructive",
      });
      return;
    }

    const purchaseQty = parseFloat(editForm.purchase_quantity) || 0;
    const purchasePrice = parseFloat(editForm.purchase_price) || 0;

    if (purchaseQty <= 0 || purchasePrice <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Quantidade e custo devem ser maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .update({
          name: editForm.name.trim(),
          unit: editForm.unit,
          purchase_quantity: purchaseQty,
          purchase_price: purchasePrice,
          correction_factor: parseFloat(editForm.correction_factor) || 1,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setIngredients(ingredients.map(i => i.id === id ? data : i));
      setEditingId(null);
      setEditForm(emptyIngredient);
      
      toast({
        title: "Insumo atualizado! ✓",
        description: `${data.name} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error updating ingredient:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar o insumo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from("ingredients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setIngredients(ingredients.filter(i => i.id !== id));
      
      toast({
        title: "Insumo removido",
        description: `${name} foi excluído.`,
      });
    } catch (error: any) {
      console.error("Error deleting ingredient:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o insumo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (ingredients.length === 0) {
      toast({
        title: "Adicione pelo menos um insumo",
        description: "Cadastre ao menos um insumo antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onAdvance();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await onAdvance();
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Adicionar Insumos
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os ingredientes que você usa nas suas receitas
          </p>
        </div>
      </div>

      {/* Import Tutorial - shown when no ingredients yet */}
      {ingredients.length === 0 && (
        <div className="space-y-4 mb-6">
          {/* Primary CTA: Import from Spreadsheet */}
          <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ClipboardCopy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  📋 Já tem uma planilha? Importe em segundos!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Não perca tempo digitando — copie da sua planilha e cole aqui.
                </p>
              </div>
            </div>

            {/* Step-by-step guide */}
            <div className="grid gap-2.5">
              {[
                { step: 1, emoji: "📂", text: "Abra sua planilha (Excel, Google Sheets, etc.)" },
                { step: 2, emoji: "📋", text: "Selecione os dados com os insumos e copie (Ctrl+C)" },
                { step: 3, emoji: "✨", text: "Clique no botão abaixo, cole e pronto! A IA mapeia tudo." },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="text-sm text-foreground">
                    <span className="mr-1">{item.emoji}</span> {item.text}
                  </span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full gap-2 text-base"
              onClick={() => setImportModalOpen(true)}
            >
              <Sparkles className="w-5 h-5" />
              Importar da Planilha (rápido e fácil)
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">ou cadastre manualmente</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Toggle manual form */}
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showManualForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showManualForm ? "Ocultar formulário manual" : "Digitar insumos um a um"}
          </button>
        </div>
      )}

      {/* Tip for users with ingredients */}
      {ingredients.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Dica importante</p>
            <p className="text-muted-foreground">
              Cadastre os insumos com o preço e quantidade da compra. O custo unitário
              é calculado automaticamente. Ex: 1kg de farinha por R$ 5,00 = R$ 5,00/kg.
            </p>
          </div>
        </div>
      )}

      {/* Import button when user already has ingredients */}
      {ingredients.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setImportModalOpen(true)}
          >
            <ClipboardCopy className="w-4 h-4" />
            Importar mais da planilha
          </Button>
        </div>
      )}

      {/* Add new ingredient form - shown when has ingredients OR manually toggled */}
      {(ingredients.length > 0 || showManualForm) && (
      <div className="grid grid-cols-12 gap-3 items-end p-4 bg-muted/50 rounded-lg mb-4">
        <div className="col-span-12 sm:col-span-4 space-y-2">
          <Label htmlFor="new-name">
            Nome do Insumo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new-name"
            placeholder="Ex: Farinha de Trigo"
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
          />
        </div>

        <div className="col-span-6 sm:col-span-2 space-y-2">
          <Label htmlFor="new-unit">Unidade</Label>
          <Select
            value={newIngredient.unit}
            onValueChange={(value) => setNewIngredient({ ...newIngredient, unit: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-6 sm:col-span-2 space-y-2">
          <Label htmlFor="new-qty">
            Quantidade <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new-qty"
            type="number"
            step="0.01"
            min="0"
            placeholder="1"
            value={newIngredient.purchase_quantity}
            onChange={(e) => setNewIngredient({ ...newIngredient, purchase_quantity: e.target.value })}
          />
        </div>

        <div className="col-span-6 sm:col-span-2 space-y-2">
          <Label htmlFor="new-price">
            Custo (R$) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={newIngredient.purchase_price}
            onChange={(e) => setNewIngredient({ ...newIngredient, purchase_price: e.target.value })}
          />
        </div>

        <div className="col-span-6 sm:col-span-2">
          <Button
            type="button"
            onClick={handleAddIngredient}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </>
            )}
          </Button>
        </div>
      </div>
      )}

      {/* Import modal */}
      {userId && (
        <SpreadsheetImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          userId={userId}
          storeId={defaultStoreId}
          existingIngredients={ingredients.map(i => ({ name: i.name }))}
          onImportComplete={fetchData}
        />
      )}

      {/* Ingredients table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : ingredients.length > 0 ? (
        <div className="border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Cód</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                <TableHead className="w-24 text-right">Qtd.</TableHead>
                <TableHead className="w-28 text-right">Custo</TableHead>
                <TableHead className="w-28 text-right">Custo Unit.</TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  {editingId === ingredient.id ? (
                    <>
                      <TableCell className="font-mono text-sm text-primary font-semibold">
                        {ingredient.code}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.unit}
                          onValueChange={(value) => setEditForm({ ...editForm, unit: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.purchase_quantity}
                          onChange={(e) => setEditForm({ ...editForm, purchase_quantity: e.target.value })}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.purchase_price}
                          onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(
                          (parseFloat(editForm.purchase_price) || 0) / 
                          (parseFloat(editForm.purchase_quantity) || 1)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => handleSaveEdit(ingredient.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono text-sm text-primary font-semibold">
                        {ingredient.code}
                      </TableCell>
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell>{ingredient.unit}</TableCell>
                      <TableCell className="text-right">
                        {ingredient.purchase_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ingredient.purchase_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(ingredient.unit_price)}/{ingredient.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEdit(ingredient)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(ingredient.id, ingredient.name)}
                            disabled={isDeleting === ingredient.id}
                          >
                            {isDeleting === ingredient.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !showManualForm && ingredients.length === 0 ? null : (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg mb-6">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum insumo cadastrado ainda.</p>
          <p className="text-sm">Use o formulário acima ou importe da planilha.</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="sm:flex-1"
            onClick={handleSkip}
            disabled={isLoading}
          >
            Pular por agora
          </Button>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="sm:flex-[2]"
            disabled={isLoading}
          >
            {isLoading ? "Salvando..." : `Continuar ${ingredients.length > 0 ? `(${ingredients.length} insumos)` : ""}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
