import { useState, useEffect, useCallback } from "react";
import { Search, Check, Loader2, Package, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeText } from "@/lib/utils";
import { calculateIngredientCost } from "@/lib/ingredient-utils";
import { cn } from "@/lib/utils";

interface Ingredient {
  id: string;
  code: number;
  name: string;
  unit: string;
  purchase_price: number;
  purchase_quantity: number;
  unit_price: number | null;
  correction_factor: number | null;
}

interface QuickPriceUpdateProps {
  userId: string;
  storeId: string | null;
  onPriceUpdated?: () => void;
}

export function QuickPriceUpdate({ userId, storeId, onPriceUpdated }: QuickPriceUpdateProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchIngredients = useCallback(async () => {
    let query = supabase
      .from("ingredients")
      .select("id, code, name, unit, purchase_price, purchase_quantity, unit_price, correction_factor")
      .eq("user_id", userId)
      .order("name");
    if (storeId) query = query.eq("store_id", storeId);
    const { data } = await query;
    if (data) setIngredients(data);
  }, [userId, storeId]);

  useEffect(() => {
    if (userId) fetchIngredients();
  }, [userId, fetchIngredients]);

  const filtered = ingredients.filter((ing) => {
    if (!search.trim()) return true;
    const s = normalizeText(search.trim());
    return (
      normalizeText(ing.name).includes(s) ||
      ing.code.toString().includes(search.trim())
    );
  });

  const displayList = search.trim() ? filtered : filtered.slice(0, 8);

  const handleStartEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setNewPrice(ing.purchase_price.toFixed(2).replace(".", ","));
  };

  const handleSave = async (ing: Ingredient) => {
    const parsed = parseFloat(newPrice.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Valor inválido", description: "Digite um preço válido.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update ingredient price
      await supabase
        .from("ingredients")
        .update({ purchase_price: parsed })
        .eq("id", ing.id);

      // Cascade: recalculate all recipes using this ingredient
      const qty = ing.purchase_quantity || 1;
      const fc = ing.correction_factor || 1;
      const newUnitPrice = (parsed / qty) * fc;

      const { data: affectedRI } = await supabase
        .from("recipe_ingredients")
        .select("id, quantity, unit, recipe_id")
        .eq("ingredient_id", ing.id);

      if (affectedRI && affectedRI.length > 0) {
        for (const ri of affectedRI) {
          const cost = calculateIngredientCost(newUnitPrice, ri.quantity, ri.unit, ing.unit);
          await supabase.from("recipe_ingredients").update({ cost }).eq("id", ri.id);
        }

        const recipeIds = [...new Set(affectedRI.map((ri) => ri.recipe_id))];
        for (const recipeId of recipeIds) {
          const { data: riData } = await supabase
            .from("recipe_ingredients")
            .select("cost")
            .eq("recipe_id", recipeId);
          if (riData) {
            const totalCost = riData.reduce((sum, r) => sum + (r.cost || 0), 0);
            const { data: recipeData } = await supabase
              .from("recipes")
              .select("servings")
              .eq("id", recipeId)
              .single();
            const costPerServing = totalCost / (recipeData?.servings || 1);
            await supabase
              .from("recipes")
              .update({ total_cost: totalCost, cost_per_serving: costPerServing })
              .eq("id", recipeId);
          }
        }

        toast({
          title: "Preço atualizado!",
          description: `${ing.name}: R$ ${parsed.toFixed(2)} → ${affectedRI.length} receita(s) recalculada(s).`,
        });
      } else {
        toast({
          title: "Preço atualizado!",
          description: `${ing.name}: R$ ${parsed.toFixed(2)}`,
        });
      }

      setEditingId(null);
      setNewPrice("");
      setJustSaved(ing.id);
      setTimeout(() => setJustSaved(null), 2000);
      await fetchIngredients();
      onPriceUpdated?.();
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, ing: Ingredient) => {
    if (e.key === "Enter") handleSave(ing);
    if (e.key === "Escape") {
      setEditingId(null);
      setNewPrice("");
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (ingredients.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
            Atualizar Preços
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Toque no preço para editar. Fichas técnicas são atualizadas automaticamente.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar insumo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[320px] overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Package className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
            Nenhum insumo encontrado
          </div>
        ) : (
          displayList.map((ing) => (
            <div
              key={ing.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all",
                editingId === ing.id
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/50",
                justSaved === ing.id && "bg-success/10 border border-success/20"
              )}
            >
              <span className="font-mono text-xs text-muted-foreground w-6 text-right flex-shrink-0">
                {ing.code}
              </span>
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {ing.name}
              </span>

              {editingId === ing.id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    autoFocus
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, ing)}
                    className="w-20 h-8 text-sm text-right px-2"
                    disabled={saving}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSave(ing)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit(ing)}
                  className={cn(
                    "text-sm font-semibold px-2.5 py-1 rounded-md transition-colors flex-shrink-0",
                    justSaved === ing.id
                      ? "text-success bg-success/10"
                      : "text-primary hover:bg-primary/10"
                  )}
                >
                  {justSaved === ing.id ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Salvo
                    </span>
                  ) : (
                    formatPrice(ing.purchase_price)
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!search.trim() && ingredients.length > 8 && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Mostrando 8 de {ingredients.length} • Use a busca para encontrar mais
        </p>
      )}
    </div>
  );
}
