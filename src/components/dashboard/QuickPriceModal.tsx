import { useState, useEffect, useCallback } from "react";
import { Search, Check, Loader2, Package, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeText, cn } from "@/lib/utils";
import { calculateIngredientCost } from "@/lib/ingredient-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

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

interface SaveResult {
  ingredientName: string;
  newPrice: number;
  recipesCount: number;
  riCount: number;
}

interface QuickPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  storeId: string | null;
  onSave: (result: SaveResult) => void;
}

export function QuickPriceModal({
  open,
  onOpenChange,
  userId,
  storeId,
  onSave,
}: QuickPriceModalProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    if (open && userId) {
      fetchIngredients();
      setSearch("");
      setEditingId(null);
      setNewPrice("");
      setLastResult(null);
    }
  }, [open, userId, fetchIngredients]);

  const filtered = ingredients.filter((ing) => {
    if (!search.trim()) return true;
    const s = normalizeText(search.trim());
    return normalizeText(ing.name).includes(s) || ing.code.toString().includes(search.trim());
  });

  const displayList = search.trim() ? filtered : filtered.slice(0, 10);

  const handleStartEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setNewPrice(ing.purchase_price.toFixed(2).replace(".", ","));
    setLastResult(null);
  };

  const handleSave = async (ing: Ingredient) => {
    const parsed = parseFloat(newPrice.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Valor inválido", description: "Digite um preço válido.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await supabase.from("ingredients").update({ purchase_price: parsed }).eq("id", ing.id);

      const qty = ing.purchase_quantity || 1;
      const fc = ing.correction_factor || 1;
      const newUnitPrice = (parsed / qty) * fc;

      const { data: affectedRI } = await supabase
        .from("recipe_ingredients")
        .select("id, quantity, unit, recipe_id")
        .eq("ingredient_id", ing.id);

      let recipesCount = 0;

      if (affectedRI && affectedRI.length > 0) {
        for (const ri of affectedRI) {
          const cost = calculateIngredientCost(newUnitPrice, ri.quantity, ri.unit, ing.unit);
          await supabase.from("recipe_ingredients").update({ cost }).eq("id", ri.id);
        }

        const recipeIds = [...new Set(affectedRI.map((ri) => ri.recipe_id))];
        recipesCount = recipeIds.length;

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
      }

      const result: SaveResult = {
        ingredientName: ing.name,
        newPrice: parsed,
        recipesCount,
        riCount: affectedRI?.length || 0,
      };

      setLastResult(result);
      setEditingId(null);
      setNewPrice("");
      setJustSaved(ing.id);
      setTimeout(() => setJustSaved(null), 3000);
      await fetchIngredients();
      onSave(result);
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

  const content = (
    <div className="flex flex-col gap-3 p-1">
      {/* Inline feedback */}
      {lastResult && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-success" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {lastResult.ingredientName} → {formatPrice(lastResult.newPrice)}
            </p>
            {lastResult.recipesCount > 0 ? (
              <p className="text-muted-foreground text-xs mt-0.5">
                {lastResult.riCount} insumo{lastResult.riCount > 1 ? "s" : ""} em{" "}
                <strong className="text-foreground">{lastResult.recipesCount} ficha{lastResult.recipesCount > 1 ? "s" : ""} técnica{lastResult.recipesCount > 1 ? "s" : ""}</strong>{" "}
                recalculada{lastResult.recipesCount > 1 ? "s" : ""} automaticamente
              </p>
            ) : (
              <p className="text-muted-foreground text-xs mt-0.5">Nenhuma ficha técnica usa este insumo</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhum insumo encontrado
          </div>
        ) : (
          displayList.map((ing) => (
            <div
              key={ing.id}
              className={cn(
                "flex items-center gap-2 px-3 py-3 rounded-lg transition-all",
                editingId === ing.id
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/50",
                justSaved === ing.id && "bg-success/10 border border-success/20"
              )}
            >
              <span className="font-mono text-xs text-muted-foreground w-7 text-right flex-shrink-0">
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
                    className="w-24 h-9 text-sm text-right px-2"
                    disabled={saving}
                    inputMode="decimal"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleSave(ing)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit(ing)}
                  className={cn(
                    "text-sm font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0",
                    justSaved === ing.id
                      ? "text-success bg-success/10"
                      : "text-primary hover:bg-primary/10 active:scale-95"
                  )}
                >
                  {justSaved === ing.id ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Salvo
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

      {!search.trim() && ingredients.length > 10 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Mostrando 10 de {ingredients.length} · Use a busca para encontrar mais
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Atualizar Preços</DrawerTitle>
            <DrawerDescription>Toque no preço para editar. Fichas técnicas são recalculadas automaticamente.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atualizar Preços</DialogTitle>
          <DialogDescription>Clique no preço para editar. Fichas técnicas são recalculadas automaticamente.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
