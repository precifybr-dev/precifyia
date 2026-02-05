import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRightLeft, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IngredientSelector, type IngredientData } from "@/components/recipes/IngredientSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataProtection } from "@/hooks/useDataProtection";
import { ConfirmationInput } from "@/components/security/ConfirmationInput";

interface Ingredient {
  id: string;
  code: number;
  name: string;
  unit: string;
  color?: string | null;
  purchase_price?: number;
  purchase_quantity?: number;
  unit_price?: number | null;
  correction_factor?: number | null;
  store_id?: string | null;
  user_id?: string;
}

interface RecipeUsage {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
  unit: string;
}

interface DeleteIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
  allIngredients: IngredientData[];
  onDeleted: () => void;
}

export function DeleteIngredientDialog({
  open,
  onOpenChange,
  ingredient,
  allIngredients,
  onDeleted,
}: DeleteIngredientDialogProps) {
  const [recipeUsages, setRecipeUsages] = useState<RecipeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [confirmationValid, setConfirmationValid] = useState(false);
  const [substituteIngredientId, setSubstituteIngredientId] = useState<string | null>(null);
  const { toast } = useToast();
  const { softDelete, logAction } = useDataProtection();

  // Fetch recipe usages and reset state when dialog opens
  useEffect(() => {
    if (open && ingredient) {
      fetchRecipeUsages(ingredient.id);
      setShowSubstitute(false);
      setShowFinalConfirmation(false);
      setConfirmationValid(false);
      setSubstituteIngredientId(null);
    }
  }, [open, ingredient]);

  const fetchRecipeUsages = async (ingredientId: string) => {
    setIsLoading(true);
    try {
      // Fetch from recipe_ingredients
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipe_ingredients")
        .select(`
          recipe_id,
          quantity,
          unit,
          recipes!inner(name)
        `)
        .eq("ingredient_id", ingredientId);

      if (recipeError) throw recipeError;

      // Fetch from sub_recipe_ingredients
      const { data: subRecipeData, error: subRecipeError } = await supabase
        .from("sub_recipe_ingredients")
        .select(`
          sub_recipe_id,
          quantity,
          unit,
          sub_recipes!inner(name)
        `)
        .eq("ingredient_id", ingredientId);

      if (subRecipeError) throw subRecipeError;

      const usages: RecipeUsage[] = [];

      // Map recipe usages
      if (recipeData) {
        recipeData.forEach((item: any) => {
          usages.push({
            recipe_id: item.recipe_id,
            recipe_name: `Ficha: ${item.recipes.name}`,
            quantity: item.quantity,
            unit: item.unit,
          });
        });
      }

      // Map sub-recipe usages
      if (subRecipeData) {
        subRecipeData.forEach((item: any) => {
          usages.push({
            recipe_id: item.sub_recipe_id,
            recipe_name: `Sub-receita: ${item.sub_recipes.name}`,
            quantity: item.quantity,
            unit: item.unit,
          });
        });
      }

      setRecipeUsages(usages);
    } catch (error) {
      console.error("Error fetching recipe usages:", error);
      setRecipeUsages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!ingredient) return;
    
    setIsProcessing(true);
    try {
      // First delete from recipe_ingredients
      await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("ingredient_id", ingredient.id);

      // Then delete from sub_recipe_ingredients
      await supabase
        .from("sub_recipe_ingredients")
        .delete()
        .eq("ingredient_id", ingredient.id);

      // Use soft delete instead of permanent deletion
      const ingredientData = {
        id: ingredient.id,
        code: ingredient.code,
        name: ingredient.name,
        unit: ingredient.unit,
        color: ingredient.color,
        purchase_price: ingredient.purchase_price || 0,
        purchase_quantity: ingredient.purchase_quantity || 1,
        unit_price: ingredient.unit_price,
        correction_factor: ingredient.correction_factor,
        store_id: ingredient.store_id,
        user_id: ingredient.user_id,
      };

      const success = await softDelete({
        table: "ingredients",
        id: ingredient.id,
        data: ingredientData,
        storeId: ingredient.store_id,
        confirmationSteps: showFinalConfirmation ? 3 : 2,
      });

      if (success) {
        onOpenChange(false);
        onDeleted();
      }
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o insumo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubstitute = async () => {
    if (!ingredient || !substituteIngredientId) return;

    setIsProcessing(true);
    try {
      // Get the substitute ingredient details
      const substituteIng = allIngredients.find(i => i.id === substituteIngredientId);
      if (!substituteIng) throw new Error("Ingrediente substituto não encontrado");

      // Update recipe_ingredients
      const { error: recipeError } = await supabase
        .from("recipe_ingredients")
        .update({
          ingredient_id: substituteIngredientId,
          // Recalculate cost based on new ingredient
          cost: 0, // Will be recalculated on next load
        })
        .eq("ingredient_id", ingredient.id);

      if (recipeError) throw recipeError;

      // Update sub_recipe_ingredients
      const { error: subRecipeError } = await supabase
        .from("sub_recipe_ingredients")
        .update({
          ingredient_id: substituteIngredientId,
          cost: 0, // Will be recalculated on next load
        })
        .eq("ingredient_id", ingredient.id);

      if (subRecipeError) throw subRecipeError;

      // Now delete the original ingredient
      const { error: deleteError } = await supabase
        .from("ingredients")
        .delete()
        .eq("id", ingredient.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Insumo substituído",
        description: `"${ingredient.name}" foi substituído por "${substituteIng.name}" em ${recipeUsages.length} ficha(s).`,
      });

      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Error substituting ingredient:", error);
      toast({
        title: "Erro ao substituir",
        description: "Não foi possível substituir o insumo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSubstitute = (selected: IngredientData) => {
    setSubstituteIngredientId(selected.id);
  };

  // Filter out the current ingredient from substitution options
  const availableIngredients = allIngredients.filter(
    (ing) => ing.id !== ingredient?.id
  );

  const hasUsages = recipeUsages.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {showSubstitute ? "Substituir Insumo" : "Excluir Insumo"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Verificando uso...</span>
                </div>
              ) : showSubstitute ? (
                <div className="space-y-4">
                  <p>
                    Selecione um ingrediente para substituir{" "}
                    <span className="font-semibold text-foreground">
                      "{ingredient?.name}"
                    </span>{" "}
                    em {recipeUsages.length} ficha(s):
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <IngredientSelector
                      ingredients={availableIngredients}
                      onSelect={handleSelectSubstitute}
                      selectedId={substituteIngredientId || undefined}
                      placeholder="Selecione o novo ingrediente..."
                    />
                  </div>
                </div>
              ) : showFinalConfirmation ? (
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive font-medium text-sm">
                      ⚠️ Confirmação final necessária
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O insumo "{ingredient?.name}" será removido de {recipeUsages.length} ficha(s) e movido para a lixeira.
                    </p>
                  </div>
                  <ConfirmationInput
                    expectedValue="EXCLUIR"
                    label='Digite "EXCLUIR" para confirmar'
                    onMatch={setConfirmationValid}
                  />
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      ✓ Você poderá recuperar este insumo em até 30 dias através da Lixeira
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {hasUsages ? (
                    <div className="space-y-3">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                          ⚠️ Este insumo está vinculado a {recipeUsages.length} ficha(s) técnica(s)
                        </p>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {recipeUsages.slice(0, 5).map((usage, index) => (
                          <div
                            key={index}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {usage.recipe_name}
                          </div>
                        ))}
                        {recipeUsages.length > 5 && (
                          <p className="text-sm text-muted-foreground italic">
                            ... e mais {recipeUsages.length - 5} ficha(s)
                          </p>
                        )}
                      </div>
                      <p className="text-sm">
                        Deseja excluir{" "}
                        <span className="font-semibold text-foreground">
                          "{ingredient?.name}"
                        </span>{" "}
                        mesmo assim ou prefere substituí-lo por outro?
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p>
                        Tem certeza que deseja excluir o insumo{" "}
                        <span className="font-semibold text-foreground">
                          "{ingredient?.name}"
                        </span>
                        ?
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          ✓ Este item será movido para a lixeira e pode ser recuperado em até 30 dias
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isLoading ? null : showSubstitute ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowSubstitute(false)}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button
                onClick={handleSubstitute}
                disabled={!substituteIngredientId || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Confirmar Substituição
              </Button>
            </>
          ) : showFinalConfirmation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowFinalConfirmation(false)}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!confirmationValid || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Confirmar Exclusão
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              {hasUsages && (
                <Button
                  variant="secondary"
                  onClick={() => setShowSubstitute(true)}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Substituir
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  if (hasUsages) {
                    setShowFinalConfirmation(true);
                  } else {
                    handleDelete();
                  }
                }}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Excluir
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
