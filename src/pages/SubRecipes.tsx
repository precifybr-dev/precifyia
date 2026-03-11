import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChefHat, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Package,
  Wine,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  AlertCircle,
  Pencil,
  ChevronDown,
  Sun,
  Moon
} from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type IngredientData } from "@/components/recipes/IngredientSelector";
import { calculateIngredientCost } from "@/lib/ingredient-utils";
import { normalizeText } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import IngredientsSpreadsheetTable from "@/components/recipes/IngredientsSpreadsheetTable";
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useStore } from "@/contexts/StoreContext";
import { SearchAndFilter } from "@/components/ui/SearchAndFilter";
import { useShell } from "@/components/layout/AppShell";
import { useDataProtection } from "@/hooks/useDataProtection";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";
import { useUpgradeTracking } from "@/hooks/useUpgradeTracking";
import { CopyRecipesFromStoreModal } from "@/components/recipes/CopyRecipesFromStoreModal";
import { Copy, Store as StoreIcon } from "lucide-react";
// Sub-recipe red color constant
const SUB_RECIPE_COLOR = "#ef4444";

interface SubRecipe {
  id: string;
  user_id: string;
  code: number;
  name: string;
  unit: string;
  yield_quantity: number;
  total_cost: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

interface SubRecipeIngredient {
  id: string;
  ingredientId: string | null;
  ingredientCode: number | null;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  baseUnit: string;
  cost: number;
  color: string | null;
  correctionFactor?: number | null;
}

const units = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (L)" },
  { value: "un", label: "Unidade (un)" },
];

export default function SubRecipes() {
  const { activeStore, stores } = useStore();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fichasSubmenuOpen, setFichasSubmenuOpen] = useState(true);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subRecipeToDelete, setSubRecipeToDelete] = useState<SubRecipe | null>(null);
  
  // Plan gate state
  const { isFeatureEnabled, getFeatureLimit, userPlan, loading: planLoading } = usePlanFeatures();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { trackFeatureBlocked } = useUpgradeTracking();
  const subRecipesAllowed = isFeatureEnabled("sub_recipes");
  const subRecipesLimit = getFeatureLimit("sub_recipes");
  
  // Form state
  const [recipeName, setRecipeName] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [yieldUnit, setYieldUnit] = useState("kg");
  const [recipeIngredients, setRecipeIngredients] = useState<SubRecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [copyFromStoreOpen, setCopyFromStoreOpen] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { softDelete } = useDataProtection();
  const { openSidebar } = useShell();

  // Memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Filtered and sorted sub-recipes (busca sem acentos)
  const filteredSubRecipes = useMemo(() => {
    let result = [...subRecipes];
    
    // Search by name (normalizada - ignora acentos)
    if (searchTerm) {
      const searchNormalized = normalizeText(searchTerm);
      result = result.filter(sr => 
        normalizeText(sr.name).includes(searchNormalized)
      );
    }
    
    // Sort
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "cost-asc":
        result.sort((a, b) => (a.unit_cost || 0) - (b.unit_cost || 0));
        break;
      case "cost-desc":
        result.sort((a, b) => (b.unit_cost || 0) - (a.unit_cost || 0));
        break;
      default:
        // Keep original order (by code)
        break;
    }
    
    return result;
  }, [subRecipes, searchTerm, sortOption]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profileData || profileData.onboarding_step !== "completed") {
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Re-fetch when activeStore changes
  useEffect(() => {
    if (user?.id) {
      fetchIngredients(user.id, activeStore?.id);
      fetchSubRecipes(user.id, activeStore?.id);
    }
  }, [user?.id, activeStore?.id]);

  const fetchIngredients = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .eq("is_sub_recipe", false)
      .order("code", { ascending: true });

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setIngredients(data as IngredientData[]);
    }
  };

  const fetchSubRecipes = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("sub_recipes")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true });

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setSubRecipes(data as SubRecipe[]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  const createEmptyIngredient = (): SubRecipeIngredient => ({
    id: crypto.randomUUID(),
    ingredientId: null,
    ingredientCode: null,
    name: "",
    quantity: "",
    unit: "g",
    unitPrice: 0,
    baseUnit: "kg",
    cost: 0,
    color: null,
    correctionFactor: null,
  });

  const resetForm = () => {
    setRecipeName("");
    setYieldQuantity("1");
    setYieldUnit("kg");
    setRecipeIngredients([createEmptyIngredient()]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleNewSubRecipe = () => {
    if (!subRecipesAllowed) {
      trackFeatureBlocked("sub_recipes");
      setShowUpgradePrompt(true);
      return;
    }
    // Check limit for plans with usage_limit
    if (subRecipesLimit !== null && subRecipes.length >= subRecipesLimit) {
      trackFeatureBlocked("sub_recipes");
      setShowUpgradePrompt(true);
      return;
    }
    setRecipeName("");
    setYieldQuantity("1");
    setYieldUnit("kg");
    setRecipeIngredients([createEmptyIngredient()]);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditSubRecipe = async (subRecipe: SubRecipe) => {
    // Fetch sub-recipe ingredients
    const { data, error } = await supabase
      .from("sub_recipe_ingredients")
      .select(`
        id,
        ingredient_id,
        quantity,
        unit,
        cost,
        ingredients (
          id,
          code,
          name,
          unit,
          unit_price,
          purchase_price,
          purchase_quantity,
          color
        )
      `)
      .eq("sub_recipe_id", subRecipe.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os ingredientes", variant: "destructive" });
      return;
    }

    const loadedIngredients: SubRecipeIngredient[] = (data || []).map((ri: any) => {
      const unitPrice = ri.ingredients?.unit_price ?? 
        ((ri.ingredients?.purchase_price ?? 0) / (ri.ingredients?.purchase_quantity ?? 1));
      
      const qty = parseFloat(ri.quantity) || 0;
      const recalculatedCost = qty > 0 
        ? calculateIngredientCost(unitPrice, qty, ri.unit, ri.ingredients?.unit || "kg")
        : 0;
      
      return {
        id: ri.id,
        ingredientId: ri.ingredient_id,
        ingredientCode: ri.ingredients?.code || null,
        name: ri.ingredients?.name || "",
        quantity: ri.quantity.toString(),
        unit: ri.unit,
        unitPrice: unitPrice,
        baseUnit: ri.ingredients?.unit || "kg",
        cost: recalculatedCost,
        color: ri.ingredients?.color || null,
        correctionFactor: ri.ingredients?.correction_factor || null,
      };
    });

    setRecipeName(subRecipe.name);
    setYieldQuantity(subRecipe.yield_quantity.toString());
    setYieldUnit(subRecipe.unit);
    setRecipeIngredients(loadedIngredients.length > 0 ? loadedIngredients : [createEmptyIngredient()]);
    setEditingId(subRecipe.id);
    setShowForm(true);
  };

  const handleDeleteClick = (subRecipe: SubRecipe) => {
    setSubRecipeToDelete(subRecipe);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subRecipeToDelete) return;

    // Soft delete the auto-created ingredient first
    const { data: linkedIngredient } = await supabase
      .from("ingredients")
      .select("*")
      .eq("sub_recipe_id", subRecipeToDelete.id)
      .maybeSingle();

    if (linkedIngredient) {
      await softDelete({ table: "ingredients", id: linkedIngredient.id, data: linkedIngredient, storeId: activeStore?.id || null });
    }

    // Then soft delete the sub-recipe
    const { data: record } = await supabase.from("sub_recipes").select("*").eq("id", subRecipeToDelete.id).single();
    if (record) {
      const success = await softDelete({ table: "sub_recipes", id: subRecipeToDelete.id, data: record, storeId: activeStore?.id || null });
      if (success) {
        await fetchSubRecipes(user.id, activeStore?.id);
      }
    } else {
      toast({ title: "Erro", description: "Não foi possível encontrar a sub-receita", variant: "destructive" });
    }

    setDeleteDialogOpen(false);
    setSubRecipeToDelete(null);
  };

  const handleSelectIngredient = (index: number, ing: IngredientData) => {
    const unitPrice = ing.unit_price ?? (ing.purchase_price / ing.purchase_quantity);
    
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      
      const qty = parseFloat(current.quantity) || 0;
      const cost = qty > 0 ? calculateIngredientCost(unitPrice, qty, current.unit, ing.unit) : 0;
      
      updated[index] = {
        ...current,
        ingredientId: ing.id,
        ingredientCode: ing.code,
        name: ing.name,
        unitPrice: unitPrice,
        baseUnit: ing.unit,
        cost: cost,
        color: ing.color,
        correctionFactor: (ing as any).correction_factor || null,
      };
      
      return updated;
    });
  };

  const handleQuantityChange = (index: number, value: string) => {
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const qty = parseFloat(value) || 0;
      
      const cost = qty > 0 && current.unitPrice > 0 
        ? calculateIngredientCost(current.unitPrice, qty, current.unit, current.baseUnit)
        : 0;
      
      updated[index] = {
        ...current,
        quantity: value,
        cost: cost,
      };
      
      return updated;
    });
  };

  const handleUnitChange = (index: number, unit: string) => {
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const qty = parseFloat(current.quantity) || 0;
      
      const cost = qty > 0 && current.unitPrice > 0 
        ? calculateIngredientCost(current.unitPrice, qty, unit, current.baseUnit)
        : 0;
      
      updated[index] = {
        ...current,
        unit: unit,
        cost: cost,
      };
      
      return updated;
    });
  };

  const addIngredientRow = () => {
    setRecipeIngredients((prev) => [...prev, createEmptyIngredient()]);
  };

  const removeIngredientRow = (index: number) => {
    if (recipeIngredients.length === 1) return;
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate costs
  const totalCost = recipeIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  const yieldQty = parseFloat(yieldQuantity) || 1;
  const unitCost = totalCost / yieldQty;

  const handleSaveSubRecipe = async () => {
    if (!recipeName.trim()) {
      toast({ title: "Erro", description: "Informe o nome da receita", variant: "destructive" });
      return;
    }

    const validIngredients = recipeIngredients.filter((i) => i.ingredientId && parseFloat(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um insumo com quantidade", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const subRecipeData = {
        user_id: user.id,
        store_id: activeStore?.id || null,
        name: recipeName,
        unit: yieldUnit,
        yield_quantity: yieldQty,
        total_cost: parseFloat(totalCost.toFixed(2)),
        unit_cost: parseFloat(unitCost.toFixed(2)),
      };

      let subRecipeId = editingId;
      let subRecipeCode: number;

      if (editingId) {
        // Update existing sub-recipe
        const { error: updateError } = await supabase
          .from("sub_recipes")
          .update(subRecipeData)
          .eq("id", editingId);

        if (updateError) throw updateError;

        // Get the code
        const existingSubRecipe = subRecipes.find(sr => sr.id === editingId);
        subRecipeCode = existingSubRecipe?.code || 500;

        // Delete existing ingredients
        await supabase
          .from("sub_recipe_ingredients")
          .delete()
          .eq("sub_recipe_id", editingId);

        // Update the auto-created ingredient (unit_price is a generated column, don't set it)
        await supabase
          .from("ingredients")
          .update({
            name: `[RECEITA] ${recipeName}`,
            unit: yieldUnit,
            purchase_price: parseFloat(totalCost.toFixed(2)),
            purchase_quantity: yieldQty,
            color: SUB_RECIPE_COLOR,
          })
          .eq("sub_recipe_id", editingId);

      } else {
        // Insert new sub-recipe
        const { data: newSubRecipe, error: insertError } = await supabase
          .from("sub_recipes")
          .insert(subRecipeData)
          .select()
          .single();

        if (insertError) throw insertError;
        subRecipeId = newSubRecipe.id;
        subRecipeCode = newSubRecipe.code;

        // Create auto-ingredient entry (will appear in ingredients list)
        // Note: unit_price is a generated column, it will be calculated automatically
        const { error: ingredientError } = await supabase
          .from("ingredients")
          .insert({
            user_id: user.id,
            store_id: activeStore?.id || null,
            code: subRecipeCode, // Same code as the sub-recipe
            name: `[RECEITA] ${recipeName}`,
            unit: yieldUnit,
            purchase_price: parseFloat(totalCost.toFixed(2)),
            purchase_quantity: yieldQty,
            correction_factor: 1,
            color: SUB_RECIPE_COLOR,
            is_sub_recipe: true,
            sub_recipe_id: subRecipeId,
          });

        if (ingredientError) throw ingredientError;
      }

      // Insert sub-recipe ingredients
      const ingredientsData = validIngredients.map((ing) => ({
        sub_recipe_id: subRecipeId!,
        ingredient_id: ing.ingredientId!,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
        cost: parseFloat(ing.cost.toFixed(2)),
      }));

      const { error: ingredientsError } = await supabase
        .from("sub_recipe_ingredients")
        .insert(ingredientsData);

      if (ingredientsError) throw ingredientsError;

      toast({ 
        title: editingId ? "Receita atualizada!" : "Receita criada! 🎉", 
        description: `Código ${subRecipeCode} - Custo: R$ ${unitCost.toFixed(2)}/${yieldUnit}` 
      });
      
      await fetchSubRecipes(user.id, activeStore?.id);
      resetForm();
    } catch (error: any) {
      toast({ 
        title: "Erro ao salvar", 
        description: error.message || "Não foi possível salvar a receita", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={openSidebar}>
                <Menu className="w-5 h-5" />
              </button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/app/recipes")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SUB_RECIPE_COLOR }} />
                  Receitas (Bases e Preparos)
                </h1>
                <p className="text-sm text-muted-foreground">Cadastre molhos, massas, recheios e preparos intermediários</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchAndFilter
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                sortOption={sortOption}
                onSortChange={setSortOption}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                showCostSort={true}
                showSellingSort={false}
                showColorFilter={false}
              />
              <StoreSwitcher />
              {stores.length > 1 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCopyFromStoreOpen(true)}>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copiar de outra loja</span>
                </Button>
              )}
              <Button className="gap-2" onClick={handleNewSubRecipe}>
                <Plus className="w-4 h-4" />
                Nova Receita
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {showForm ? (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${SUB_RECIPE_COLOR}20` }}>
                    <ChefHat className="w-5 h-5" style={{ color: SUB_RECIPE_COLOR }} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {editingId ? "Editar Receita" : "Nova Receita"}
                    </h2>
                    <p className="text-sm text-muted-foreground">Será convertida automaticamente em insumo</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Info box */}
              <div className="border rounded-lg p-4 mb-6 flex items-start gap-3" style={{ backgroundColor: `${SUB_RECIPE_COLOR}10`, borderColor: `${SUB_RECIPE_COLOR}30` }}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: SUB_RECIPE_COLOR }} />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Receita = Insumo Composto</p>
                  <p className="text-muted-foreground">
                    Ao salvar, esta receita será automaticamente adicionada aos seus insumos com cor vermelha e código a partir de 500. 
                    Você poderá usá-la nas Fichas Técnicas de produtos finais.
                  </p>
                </div>
              </div>

              {/* Recipe info */}
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Nome da Receita *</Label>
                  <Input
                    placeholder="Ex: Molho Especial da Casa"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rendimento Total</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    value={yieldQuantity}
                    onChange={(e) => setYieldQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade de Produção</Label>
                  <Select value={yieldUnit} onValueChange={setYieldUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ingredients list - Spreadsheet style */}
              <div className="mb-6">
                <Label className="mb-3 block">Insumos da Receita</Label>
                <IngredientsSpreadsheetTable
                  ingredients={ingredients}
                  recipeIngredients={recipeIngredients}
                  onSelectIngredient={handleSelectIngredient}
                  onQuantityChange={handleQuantityChange}
                  onUnitChange={handleUnitChange}
                  onAddRow={addIngredientRow}
                  onRemoveRow={removeIngredientRow}
                />
              </div>

              {/* Cost Summary */}
              <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: `${SUB_RECIPE_COLOR}10` }}>
                <div className="flex items-center gap-2 mb-3" style={{ color: SUB_RECIPE_COLOR }}>
                  <Calculator className="w-5 h-5" />
                  <span className="font-medium">Custos da Receita</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo por {yieldUnit}</p>
                    <p className="font-display text-2xl font-bold" style={{ color: SUB_RECIPE_COLOR }}>
                      {formatCurrency(unitCost)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSubRecipe} disabled={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? "Salvando..." : editingId ? "Atualizar Receita" : "Salvar Receita"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {filteredSubRecipes.length === 0 && subRecipes.length > 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center shadow-card">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${SUB_RECIPE_COLOR}20` }}>
                    <ChefHat className="w-8 h-8" style={{ color: SUB_RECIPE_COLOR }} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    Nenhuma receita encontrada
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Nenhuma receita corresponde aos filtros selecionados.
                  </p>
                </div>
              ) : subRecipes.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center shadow-card">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${SUB_RECIPE_COLOR}20` }}>
                    <ChefHat className="w-8 h-8" style={{ color: SUB_RECIPE_COLOR }} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    Nenhuma receita cadastrada
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Cadastre molhos, massas, recheios e preparos que serão usados como insumos nas suas fichas técnicas de produtos finais.
                  </p>
                  <Button onClick={handleNewSubRecipe} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeira Receita
                  </Button>
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Rendimento</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                        <TableHead className="text-right">Custo Unitário</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubRecipes.map((sr) => (
                        <TableRow key={sr.id}>
                          <TableCell>
                            <span className="flex items-center gap-2 font-mono font-semibold" style={{ color: SUB_RECIPE_COLOR }}>
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUB_RECIPE_COLOR }} />
                              {sr.code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{sr.name}</TableCell>
                          <TableCell className="text-right">
                            {sr.yield_quantity} {sr.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sr.total_cost)}
                          </TableCell>
                          <TableCell className="text-right font-semibold" style={{ color: SUB_RECIPE_COLOR }}>
                            {formatCurrency(sr.unit_cost)}/{sr.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditSubRecipe(sr)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(sr)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{subRecipeToDelete?.name}"? 
              Esta ação também removerá o insumo associado e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanUpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        currentPlan={userPlan}
        feature="sub_recipes"
        limitReached="sub-receitas"
      />

      {user && activeStore && stores.length > 1 && (
        <CopyRecipesFromStoreModal
          open={copyFromStoreOpen}
          onOpenChange={setCopyFromStoreOpen}
          stores={stores}
          activeStoreId={activeStore.id}
          userId={user.id}
          onCopyComplete={() => fetchSubRecipes(user.id, activeStore?.id)}
          mode="sub-recipes"
        />
      )}
    </div>
  );
}
