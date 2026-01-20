import { useState, useEffect } from "react";
import { Package, Plus, Trash2, AlertCircle, Pencil, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatIngredientCode } from "@/lib/ingredient-utils";

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
  const { toast } = useToast();

  // Fetch ingredients on mount
  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("user_id", user.id)
        .order("code", { ascending: true });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast({
        title: "Erro ao carregar insumos",
        description: "Não foi possível carregar seus insumos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

      const { data, error } = await supabase
        .from("ingredients")
        .insert({
          user_id: user.id,
          name: newIngredient.name.trim(),
          unit: newIngredient.unit,
          purchase_quantity: purchaseQty,
          purchase_price: purchasePrice,
          correction_factor: parseFloat(newIngredient.correction_factor) || 1,
        })
        .select()
        .single();

      if (error) throw error;

      setIngredients([...ingredients, data]);
      setNewIngredient(emptyIngredient);
      
      toast({
        title: "Insumo adicionado! ✓",
        description: `${data.name} foi cadastrado com sucesso.`,
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

      {/* Add new ingredient form */}
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
                        {formatIngredientCode(ingredient.code)}
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
                        {formatIngredientCode(ingredient.code)}
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
      ) : (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg mb-6">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum insumo cadastrado ainda.</p>
          <p className="text-sm">Use o formulário acima para adicionar.</p>
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
