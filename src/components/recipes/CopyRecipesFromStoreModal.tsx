import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Store } from "@/contexts/StoreContext";
import { Loader2, Store as StoreIcon, ChefHat } from "lucide-react";
import { normalizeText } from "@/lib/utils";

interface CopyRecipesFromStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
  activeStoreId: string;
  userId: string;
  onCopyComplete: () => void;
}

interface SourceRecipe {
  id: string;
  name: string;
  cost_per_serving: number | null;
  servings: number;
  total_cost: number | null;
  cmv_target: number | null;
  suggested_price: number | null;
}

export function CopyRecipesFromStoreModal({
  open,
  onOpenChange,
  stores,
  activeStoreId,
  userId,
  onCopyComplete,
}: CopyRecipesFromStoreModalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [recipes, setRecipes] = useState<SourceRecipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [copying, setCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const otherStores = stores.filter((s) => s.id !== activeStoreId);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedStoreId("");
      setRecipes([]);
      setSelectedRecipeIds(new Set());
      setProgress(0);
      setCopying(false);
    }
  }, [open]);

  // Fetch recipes when store is selected
  useEffect(() => {
    if (!selectedStoreId) {
      setRecipes([]);
      setSelectedRecipeIds(new Set());
      return;
    }

    const fetchRecipes = async () => {
      setLoadingRecipes(true);
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, cost_per_serving, servings, total_cost, cmv_target, suggested_price")
        .eq("user_id", userId)
        .eq("store_id", selectedStoreId)
        .order("name");

      if (error) {
        toast({ title: "Erro", description: "Não foi possível carregar as receitas.", variant: "destructive" });
      } else {
        setRecipes(data || []);
      }
      setLoadingRecipes(false);
    };

    fetchRecipes();
  }, [selectedStoreId, userId, toast]);

  const toggleRecipe = (id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRecipeIds.size === recipes.length) {
      setSelectedRecipeIds(new Set());
    } else {
      setSelectedRecipeIds(new Set(recipes.map((r) => r.id)));
    }
  };

  const handleCopy = async () => {
    if (selectedRecipeIds.size === 0) return;
    setCopying(true);
    setProgress(0);

    const selected = recipes.filter((r) => selectedRecipeIds.has(r.id));
    let copied = 0;
    let errors = 0;

    // Pre-fetch destination ingredients once
    const { data: destIngredients } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .eq("store_id", activeStoreId);

    // Get max code in destination store for sequential code generation
    let destMaxCode = 0;
    if (destIngredients && destIngredients.length > 0) {
      destMaxCode = Math.max(...destIngredients.map((i: any) => i.code || 0));
    }

    const destIngredientsMap = new Map(
      (destIngredients || []).map((i: any) => [normalizeText(i.name), i])
    );

    for (const recipe of selected) {
      try {
        // 1. Fetch recipe ingredients from source
        const { data: recipeIngs } = await supabase
          .from("recipe_ingredients")
          .select(`
            ingredient_id, quantity, unit, cost,
            ingredients (
              id, name, purchase_price, purchase_quantity, unit, unit_price, correction_factor, color, is_sub_recipe, sub_recipe_id
            )
          `)
          .eq("recipe_id", recipe.id);

        // 2. Map ingredients to destination store
        const ingredientMapping: Record<string, string> = {};

        for (const ri of recipeIngs || []) {
          const srcIng = (ri as any).ingredients;
          if (!srcIng) continue;

          const normalizedName = normalizeText(srcIng.name);
          const existing = destIngredientsMap.get(normalizedName);

          if (existing) {
            ingredientMapping[srcIng.id] = existing.id;
          } else {
            // Create ingredient in destination store with sequential code + retry on collision
            const correctionFactor = srcIng.correction_factor ?? 1;
            const purchaseQty = srcIng.purchase_quantity || 1;
            const calculatedUnitPrice = (srcIng.purchase_price / purchaseQty) * correctionFactor;

            let newIng: any = null;
            let retries = 3;
            while (retries > 0) {
              destMaxCode++;
              const { data, error: ingErr } = await supabase
                .from("ingredients")
                .insert({
                  user_id: userId,
                  store_id: activeStoreId,
                  code: destMaxCode,
                  name: srcIng.name,
                  purchase_price: srcIng.purchase_price,
                  purchase_quantity: srcIng.purchase_quantity,
                  unit: srcIng.unit,
                  unit_price: calculatedUnitPrice,
                  correction_factor: srcIng.correction_factor,
                  color: srcIng.color,
                  is_sub_recipe: false,
                  sub_recipe_id: null,
                })
                .select()
                .single();

              if (!ingErr && data) {
                newIng = data;
                break;
              }
              // If unique constraint violation, retry with next code
              if (ingErr?.code === "23505") {
                retries--;
                continue;
              }
              console.error("Error creating ingredient:", ingErr);
              break;
            }

            if (!newIng) {
              console.error("Failed to create ingredient after retries:", srcIng.name);
              continue;
            }

            ingredientMapping[srcIng.id] = newIng.id;
            destIngredientsMap.set(normalizedName, newIng);
          }
        }

        // 3. Create recipe in destination store
        const { data: newRecipe, error: recipeErr } = await supabase
          .from("recipes")
          .insert({
            user_id: userId,
            store_id: activeStoreId,
            name: recipe.name,
            servings: recipe.servings,
            total_cost: recipe.total_cost,
            cost_per_serving: recipe.cost_per_serving,
            suggested_price: recipe.suggested_price,
            cmv_target: recipe.cmv_target,
            selling_price: null,
            ifood_selling_price: null,
          })
          .select()
          .single();

        if (recipeErr || !newRecipe) {
          throw recipeErr || new Error("Falha ao criar receita");
        }

        // 4. Create recipe ingredients
        if (recipeIngs && recipeIngs.length > 0) {
          const newRecipeIngs = recipeIngs
            .filter((ri) => ingredientMapping[ri.ingredient_id])
            .map((ri) => ({
              recipe_id: newRecipe.id,
              ingredient_id: ingredientMapping[ri.ingredient_id],
              quantity: ri.quantity,
              unit: ri.unit,
              cost: ri.cost,
            }));

          if (newRecipeIngs.length > 0) {
            await supabase.from("recipe_ingredients").insert(newRecipeIngs);
          }
        }

        copied++;
      } catch (err: any) {
        console.error(`Error copying recipe ${recipe.name}:`, err);
        errors++;
      }

      setProgress(Math.round(((copied + errors) / selected.length) * 100));
    }

    setCopying(false);

    if (copied > 0) {
      toast({
        title: "Receitas copiadas!",
        description: `${copied} ficha${copied > 1 ? "s" : ""} técnica${copied > 1 ? "s" : ""} copiada${copied > 1 ? "s" : ""} com sucesso.${errors > 0 ? ` ${errors} erro${errors > 1 ? "s" : ""}.` : ""}`,
      });
      onCopyComplete();
      onOpenChange(false);
    } else {
      toast({
        title: "Erro na cópia",
        description: "Não foi possível copiar as receitas selecionadas.",
        variant: "destructive",
      });
    }
  };

  const activeStoreName = stores.find((s) => s.id === activeStoreId)?.name || "loja atual";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-primary" />
            Copiar Fichas de Outra Loja
          </DialogTitle>
          <DialogDescription>
            Copie fichas técnicas de suas outras lojas para <strong>{activeStoreName}</strong>. Ingredientes inexistentes serão criados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Select source store */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Loja de origem</label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId} disabled={copying}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja de origem" />
              </SelectTrigger>
              <SelectContent>
                {otherStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Recipe list */}
          {selectedStoreId && (
            <div className="space-y-2">
              {loadingRecipes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma receita encontrada nesta loja.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {recipes.length} receita{recipes.length > 1 ? "s" : ""} encontrada{recipes.length > 1 ? "s" : ""}
                    </span>
                    <Button variant="ghost" size="sm" onClick={toggleAll} disabled={copying}>
                      {selectedRecipeIds.size === recipes.length ? "Desmarcar todas" : "Selecionar todas"}
                    </Button>
                  </div>
                  <ScrollArea className="h-[240px] rounded-md border border-border">
                    <div className="p-2 space-y-1">
                      {recipes.map((recipe) => (
                        <label
                          key={recipe.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedRecipeIds.has(recipe.id)}
                            onCheckedChange={() => toggleRecipe(recipe.id)}
                            disabled={copying}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <ChefHat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{recipe.name}</span>
                            </div>
                            {recipe.cost_per_serving != null && (
                              <span className="text-xs text-muted-foreground">
                                Custo/porção: R$ {recipe.cost_per_serving.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          {/* Progress bar */}
          {copying && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Copiando... {progress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={copying}>
            Cancelar
          </Button>
          <Button
            onClick={handleCopy}
            disabled={selectedRecipeIds.size === 0 || copying}
          >
            {copying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Copiando...
              </>
            ) : (
              `Copiar ${selectedRecipeIds.size > 0 ? selectedRecipeIds.size : ""} Selecionada${selectedRecipeIds.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
