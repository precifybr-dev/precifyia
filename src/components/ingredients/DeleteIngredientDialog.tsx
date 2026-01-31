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

interface Ingredient {
  id: string;
  code: number;
  name: string;
  unit: string;
  color?: string | null;
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
  const [substituteIngredientId, setSubstituteIngredientId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch recipe usages when dialog opens
  useEffect(() => {
    if (open && ingredient) {
      fetchRecipeUsages(ingredient.id);
      setShowSubstitute(false);
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

      // Finally delete the ingredient
      const { error } = await supabase
        .from("ingredients")
        .delete()
        .eq("id", ingredient.id);

      if (error) throw error;

      toast({
        title: "Insumo excluído",
        description: `"${ingredient.name}" foi removido com sucesso.`,
      });

      onOpenChange(false);
      onDeleted();
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
                    <p>
                      Tem certeza que deseja excluir o insumo{" "}
                      <span className="font-semibold text-foreground">
                        "{ingredient?.name}"
                      </span>
                      ? Esta ação não pode ser desfeita.
                    </p>
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
                onClick={handleDelete}
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
