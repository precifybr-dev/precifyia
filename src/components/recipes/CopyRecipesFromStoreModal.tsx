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

type CopyMode = "recipes" | "sub-recipes";

interface CopyRecipesFromStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
  activeStoreId: string;
  userId: string;
  onCopyComplete: () => void;
  mode?: CopyMode;
}

interface SourceItem {
  id: string;
  name: string;
  cost_per_serving?: number | null;
  servings?: number;
  total_cost: number | null;
  cmv_target?: number | null;
  suggested_price?: number | null;
  unit_cost?: number;
  yield_quantity?: number;
  unit?: string;
}

export function CopyRecipesFromStoreModal({
  open,
  onOpenChange,
  stores,
  activeStoreId,
  userId,
  onCopyComplete,
  mode = "recipes",
}: CopyRecipesFromStoreModalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [copying, setCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const isSubRecipeMode = mode === "sub-recipes";
  const label = isSubRecipeMode ? "Sub-Receita" : "Ficha Técnica";
  const labelPlural = isSubRecipeMode ? "Sub-Receitas" : "Fichas Técnicas";

  const otherStores = stores.filter((s) => s.id !== activeStoreId);

  useEffect(() => {
    if (!open) {
      setSelectedStoreId("");
      setItems([]);
      setSelectedIds(new Set());
      setProgress(0);
      setCopying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedStoreId) {
      setItems([]);
      setSelectedIds(new Set());
      return;
    }

    const fetchItems = async () => {
      setLoadingItems(true);
      if (isSubRecipeMode) {
        const { data, error } = await supabase
          .from("sub_recipes")
          .select("id, name, total_cost, unit_cost, yield_quantity, unit")
          .eq("user_id", userId)
          .eq("store_id", selectedStoreId)
          .order("name");

        if (error) {
          toast({ title: "Erro", description: "Não foi possível carregar as sub-receitas.", variant: "destructive" });
        } else {
          setItems((data || []).map((d) => ({ ...d, cost_per_serving: d.unit_cost })));
        }
      } else {
        const { data, error } = await supabase
          .from("recipes")
          .select("id, name, cost_per_serving, servings, total_cost, cmv_target, suggested_price")
          .eq("user_id", userId)
          .eq("store_id", selectedStoreId)
          .order("name");

        if (error) {
          toast({ title: "Erro", description: "Não foi possível carregar as receitas.", variant: "destructive" });
        } else {
          setItems(data || []);
        }
      }
      setLoadingItems(false);
    };

    fetchItems();
  }, [selectedStoreId, userId, toast, isSubRecipeMode]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((r) => r.id)));
    }
  };

  // Shared: fetch dest ingredients & build map
  const prepareDestIngredients = async () => {
    const { data: destIngredients } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .eq("store_id", activeStoreId);

    let destMaxCode = 0;
    if (destIngredients && destIngredients.length > 0) {
      destMaxCode = Math.max(...destIngredients.map((i: any) => i.code || 0));
    }

    const destIngredientsMap = new Map(
      (destIngredients || []).map((i: any) => [normalizeText(i.name), i])
    );

    return { destMaxCode, destIngredientsMap };
  };

  // Shared: map or create ingredient in destination
  const mapOrCreateIngredient = async (
    srcIng: any,
    destIngredientsMap: Map<string, any>,
    destMaxCodeRef: { value: number }
  ): Promise<string | null> => {
    const normalizedName = normalizeText(srcIng.name);
    const existing = destIngredientsMap.get(normalizedName);

    if (existing) return existing.id;

    const correctionFactor = srcIng.correction_factor ?? 1;
    const purchaseQty = srcIng.purchase_quantity || 1;
    const calculatedUnitPrice = (srcIng.purchase_price / purchaseQty) * correctionFactor;

    let newIng: any = null;
    let retries = 3;
    while (retries > 0) {
      destMaxCodeRef.value++;
      const { data, error: ingErr } = await supabase
        .from("ingredients")
        .insert({
          user_id: userId,
          store_id: activeStoreId,
          code: destMaxCodeRef.value,
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
      if (ingErr?.code === "23505") {
        retries--;
        continue;
      }
      console.error("Error creating ingredient:", ingErr);
      break;
    }

    if (!newIng) {
      console.error("Failed to create ingredient after retries:", srcIng.name);
      return null;
    }

    destIngredientsMap.set(normalizedName, newIng);
    return newIng.id;
  };

  const handleCopyRecipes = async (selected: SourceItem[]) => {
    const { destMaxCode, destIngredientsMap } = await prepareDestIngredients();
    const destMaxCodeRef = { value: destMaxCode };
    let copied = 0;
    let errors = 0;

    for (const recipe of selected) {
      try {
        const { data: recipeIngs } = await supabase
          .from("recipe_ingredients")
          .select(`
            ingredient_id, quantity, unit, cost,
            ingredients (
              id, name, purchase_price, purchase_quantity, unit, unit_price, correction_factor, color, is_sub_recipe, sub_recipe_id
            )
          `)
          .eq("recipe_id", recipe.id);

        const ingredientMapping: Record<string, string> = {};
        for (const ri of recipeIngs || []) {
          const srcIng = (ri as any).ingredients;
          if (!srcIng) continue;
          const mappedId = await mapOrCreateIngredient(srcIng, destIngredientsMap, destMaxCodeRef);
          if (mappedId) ingredientMapping[srcIng.id] = mappedId;
        }

        const { data: newRecipe, error: recipeErr } = await supabase
          .from("recipes")
          .insert({
            user_id: userId,
            store_id: activeStoreId,
            name: recipe.name,
            servings: recipe.servings || 1,
            total_cost: recipe.total_cost,
            cost_per_serving: recipe.cost_per_serving,
            suggested_price: recipe.suggested_price,
            cmv_target: recipe.cmv_target,
            selling_price: null,
            ifood_selling_price: null,
          })
          .select()
          .single();

        if (recipeErr || !newRecipe) throw recipeErr || new Error("Falha ao criar receita");

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

    return { copied, errors };
  };

  const handleCopySubRecipes = async (selected: SourceItem[]) => {
    const { destMaxCode, destIngredientsMap } = await prepareDestIngredients();
    const destMaxCodeRef = { value: destMaxCode };

    // Also get max sub_recipe code in destination
    const { data: destSubRecipes } = await supabase
      .from("sub_recipes")
      .select("code")
      .eq("user_id", userId)
      .eq("store_id", activeStoreId);
    
    // Copied sub-recipes use code range 500-599
    const COPY_CODE_START = 500;
    const COPY_CODE_END = 599;
    let destSubRecipeMaxCode = COPY_CODE_START - 1;
    if (destSubRecipes && destSubRecipes.length > 0) {
      const codesInRange = destSubRecipes
        .map((sr: any) => sr.code || 0)
        .filter((c: number) => c >= COPY_CODE_START && c <= COPY_CODE_END);
      if (codesInRange.length > 0) {
        destSubRecipeMaxCode = Math.max(...codesInRange);
      }
    }

    let copied = 0;
    let errors = 0;

    for (const subRecipe of selected) {
      try {
        // 1. Fetch sub_recipe_ingredients from source
        const { data: subRecipeIngs, error: fetchErr } = await supabase
          .from("sub_recipe_ingredients")
          .select(`
            ingredient_id, quantity, unit, cost,
            ingredients (
              id, name, purchase_price, purchase_quantity, unit, unit_price, correction_factor, color
            )
          `)
          .eq("sub_recipe_id", subRecipe.id);

        if (fetchErr) {
          console.error("Error fetching sub_recipe_ingredients:", fetchErr);
          throw fetchErr;
        }

        console.log(`Sub-recipe "${subRecipe.name}": found ${subRecipeIngs?.length || 0} ingredients`);

        // 2. Map ingredients — create missing ones in destination
        const ingredientMapping: Record<string, string> = {};
        for (const ri of subRecipeIngs || []) {
          const srcIng = (ri as any).ingredients;
          if (!srcIng) {
            console.warn("Ingredient data missing for ingredient_id:", ri.ingredient_id);
            continue;
          }
          const mappedId = await mapOrCreateIngredient(srcIng, destIngredientsMap, destMaxCodeRef);
          if (mappedId) {
            ingredientMapping[srcIng.id] = mappedId;
          } else {
            console.warn("Failed to map/create ingredient:", srcIng.name);
          }
        }

        console.log(`Mapped ${Object.keys(ingredientMapping).length} ingredients for "${subRecipe.name}"`);

        // 3. Create sub_recipe in destination
        destSubRecipeMaxCode++;
        const { data: newSubRecipe, error: srErr } = await supabase
          .from("sub_recipes")
          .insert({
            user_id: userId,
            store_id: activeStoreId,
            code: destSubRecipeMaxCode,
            name: subRecipe.name,
            unit: subRecipe.unit || "kg",
            yield_quantity: subRecipe.yield_quantity || 1,
            total_cost: subRecipe.total_cost || 0,
            unit_cost: subRecipe.unit_cost || 0,
          })
          .select()
          .single();

        if (srErr || !newSubRecipe) throw srErr || new Error("Falha ao criar sub-receita");

        // 4. Create sub_recipe_ingredients with mapped ingredient IDs
        if (subRecipeIngs && subRecipeIngs.length > 0) {
          const newSubRecipeIngs = subRecipeIngs
            .filter((ri) => ingredientMapping[ri.ingredient_id])
            .map((ri) => {
              const destIngId = ingredientMapping[ri.ingredient_id];
              // Recalculate cost using destination ingredient unit_price
              const destIng = Array.from(destIngredientsMap.values()).find((i: any) => i.id === destIngId);
              const recalculatedCost = destIng ? ri.quantity * (destIng.unit_price || 0) : ri.cost;
              return {
                sub_recipe_id: newSubRecipe.id,
                ingredient_id: destIngId,
                quantity: ri.quantity,
                unit: ri.unit,
                cost: recalculatedCost,
              };
            });
          if (newSubRecipeIngs.length > 0) {
            const { error: ingInsertErr } = await supabase.from("sub_recipe_ingredients").insert(newSubRecipeIngs);
            if (ingInsertErr) {
              console.error("Error inserting sub_recipe_ingredients:", ingInsertErr);
              throw ingInsertErr;
            }
            console.log(`Inserted ${newSubRecipeIngs.length} ingredients into sub-recipe "${subRecipe.name}"`);
          }
        }

        // 5. Create linked ingredient (is_sub_recipe = true) — uses same code as the sub-recipe
        const linkedIngCode = destSubRecipeMaxCode; // same code assigned to the sub-recipe
        let linkedRetries = 3;
        while (linkedRetries > 0) {
          const { error: linkedErr } = await supabase
            .from("ingredients")
            .insert({
              user_id: userId,
              store_id: activeStoreId,
              code: linkedIngCode,
              name: subRecipe.name,
              is_sub_recipe: true,
              sub_recipe_id: newSubRecipe.id,
              purchase_price: subRecipe.total_cost || 0,
              purchase_quantity: subRecipe.yield_quantity || 1,
              unit: subRecipe.unit || "kg",
              unit_price: subRecipe.unit_cost || 0,
              correction_factor: 1,
              color: "#ef4444",
            });

          if (!linkedErr) break;
          if (linkedErr.code === "23505") {
            destMaxCodeRef.value++;
            linkedRetries--;
            continue;
          }
          console.error("Error creating linked ingredient:", linkedErr);
          break;
        }

        copied++;
      } catch (err: any) {
        console.error(`Error copying sub-recipe ${subRecipe.name}:`, err);
        errors++;
      }
      setProgress(Math.round(((copied + errors) / selected.length) * 100));
    }

    return { copied, errors };
  };

  const handleCopy = async () => {
    if (selectedIds.size === 0) return;
    setCopying(true);
    setProgress(0);

    const selected = items.filter((r) => selectedIds.has(r.id));

    const { copied, errors } = isSubRecipeMode
      ? await handleCopySubRecipes(selected)
      : await handleCopyRecipes(selected);

    setCopying(false);

    if (copied > 0) {
      toast({
        title: `${labelPlural} copiadas!`,
        description: `${copied} ${copied > 1 ? labelPlural.toLowerCase() : label.toLowerCase()} copiada${copied > 1 ? "s" : ""} com sucesso.${errors > 0 ? ` ${errors} erro${errors > 1 ? "s" : ""}.` : ""}`,
      });
      onCopyComplete();
      onOpenChange(false);
    } else {
      toast({
        title: "Erro na cópia",
        description: `Não foi possível copiar as ${labelPlural.toLowerCase()} selecionadas.`,
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
            Copiar {labelPlural} de Outra Loja
          </DialogTitle>
          <DialogDescription>
            Copie {labelPlural.toLowerCase()} de suas outras lojas para <strong>{activeStoreName}</strong>. Ingredientes inexistentes serão criados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {selectedStoreId && (
            <div className="space-y-2">
              {loadingItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma {label.toLowerCase()} encontrada nesta loja.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {items.length} {items.length > 1 ? labelPlural.toLowerCase() : label.toLowerCase()} encontrada{items.length > 1 ? "s" : ""}
                    </span>
                    <Button variant="ghost" size="sm" onClick={toggleAll} disabled={copying}>
                      {selectedIds.size === items.length ? "Desmarcar todas" : "Selecionar todas"}
                    </Button>
                  </div>
                  <ScrollArea className="h-[240px] rounded-md border border-border">
                    <div className="p-2 space-y-1">
                      {items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                            disabled={copying}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <ChefHat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{item.name}</span>
                            </div>
                            {item.cost_per_serving != null && (
                              <span className="text-xs text-muted-foreground">
                                {isSubRecipeMode ? "Custo unitário" : "Custo/porção"}: R$ {item.cost_per_serving.toFixed(2)}
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
            disabled={selectedIds.size === 0 || copying}
          >
            {copying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Copiando...
              </>
            ) : (
              `Copiar ${selectedIds.size > 0 ? selectedIds.size : ""} Selecionada${selectedIds.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
