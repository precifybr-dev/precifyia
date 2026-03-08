import { useState, useEffect, useCallback } from "react";
import { Search, Check, Loader2, Package, ShoppingCart, RefreshCw, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeText, cn } from "@/lib/utils";
import { calculateIngredientCost } from "@/lib/ingredient-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
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

type SyncPhase = "idle" | "syncing" | "complete";

export function QuickPriceModal({ open, onOpenChange, userId, storeId, onSave }: QuickPriceModalProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
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
      setPreviousPrice(null);
      setLastResult(null);
      setSyncPhase("idle");
    }
  }, [open, userId, fetchIngredients]);

  const filtered = ingredients.filter((ing) => {
    if (!search.trim()) return true;
    const s = normalizeText(search.trim());
    return normalizeText(ing.name).includes(s) || ing.code.toString().includes(search.trim());
  });

  const displayList = search.trim() ? filtered : filtered.slice(0, 10);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleStartEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setPreviousPrice(ing.purchase_price);
    setNewPrice(ing.purchase_price.toFixed(2).replace(".", ","));
    setLastResult(null);
    setSyncPhase("idle");
  };

  const handleSave = async (ing: Ingredient) => {
    const parsed = parseFloat(newPrice.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Valor inválido", description: "Digite um preço válido.", variant: "destructive" });
      return;
    }

    setSyncPhase("syncing");
    setSyncProgress({ current: 0, total: 0 });

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
        setSyncProgress({ current: 0, total: recipesCount });

        for (let i = 0; i < recipeIds.length; i++) {
          const recipeId = recipeIds[i];
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
          setSyncProgress({ current: i + 1, total: recipesCount });
        }
      }

      const result: SaveResult = {
        ingredientName: ing.name,
        newPrice: parsed,
        recipesCount,
        riCount: affectedRI?.length || 0,
      };

      setSyncPhase("complete");
      setLastResult(result);
      setEditingId(null);
      setNewPrice("");
      setPreviousPrice(null);
      setJustSaved(ing.id);
      setTimeout(() => setJustSaved(null), 3000);
      setTimeout(() => setSyncPhase("idle"), 4000);
      await fetchIngredients();
      onSave(result);
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      setSyncPhase("idle");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, ing: Ingredient) => {
    if (e.key === "Enter") handleSave(ing);
    if (e.key === "Escape") {
      setEditingId(null);
      setNewPrice("");
      setPreviousPrice(null);
    }
  };

  // --- Sync Animation Component ---
  const SyncAnimation = () => {
    const progressPercent = syncProgress.total > 0
      ? (syncProgress.current / syncProgress.total) * 100
      : 0;

    if (syncPhase === "syncing") {
      return (
        <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
          {/* Cart travel animation */}
          <div className="relative w-full h-16 flex items-center">
            {/* Market icon (start) */}
            <div className="absolute left-2 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-success" />
              </div>
              <span className="text-[9px] text-muted-foreground">Mercado</span>
            </div>

            {/* Traveling cart */}
            <div
              className="absolute top-1 h-8 flex items-center transition-all duration-500 ease-out"
              style={{ left: `calc(${Math.max(12, Math.min(progressPercent, 85))}% - 12px)` }}
            >
              <ShoppingCart className="w-6 h-6 text-success animate-bounce" />
            </div>

            {/* Sync icon (end) */}
            <div className="absolute right-2 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              </div>
              <span className="text-[9px] text-muted-foreground">Fichas</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full px-8">
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Status text */}
          <p className="text-sm text-muted-foreground font-medium">
            {syncProgress.total > 0
              ? `Sincronizando ficha ${syncProgress.current} de ${syncProgress.total}...`
              : "Atualizando insumo..."}
          </p>
        </div>
      );
    }

    if (syncPhase === "complete" && lastResult) {
      return (
        <div className="flex flex-col items-center gap-3 py-6 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {lastResult.ingredientName} → {formatPrice(lastResult.newPrice)}
            </p>
            {lastResult.recipesCount > 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                <strong className="text-success">{lastResult.recipesCount} ficha{lastResult.recipesCount > 1 ? "s" : ""} técnica{lastResult.recipesCount > 1 ? "s" : ""}</strong>{" "}
                recalculada{lastResult.recipesCount > 1 ? "s" : ""} automaticamente
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Nenhuma ficha técnica usa este insumo</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const content = (
    <div className="flex flex-col gap-3 p-1">
      {/* Sync animation overlay */}
      {syncPhase !== "idle" && <SyncAnimation />}

      {/* Search - hidden during sync */}
      {syncPhase === "idle" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar insumo por nome ou código..."
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
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {previousPrice !== null && (
                        <span className="text-[10px] text-muted-foreground">
                          Anterior: {formatPrice(previousPrice)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          autoFocus
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, ing)}
                          className="w-24 h-9 text-sm text-right px-2"
                          inputMode="decimal"
                        />
                        <Button
                          size="icon"
                          className="h-9 w-9 bg-success hover:bg-success/90"
                          onClick={() => handleSave(ing)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
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
        </>
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
