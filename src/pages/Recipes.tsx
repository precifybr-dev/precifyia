import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileSpreadsheet, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Package,
  Wine,
  ChevronRight,
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Percent,
  Pencil,
  AlertTriangle,
  Building2 as Building2Icon
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IngredientSelector, type IngredientData } from "@/components/recipes/IngredientSelector";
import { calculateIngredientCost } from "@/lib/ingredient-utils";
import { ColorDot } from "@/components/ui/color-picker";
import type { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

interface RecipeIngredient {
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
}

interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: {
    id: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    cost: number;
    ingredients: {
      id: string;
      code: number;
      name: string;
      unit: string;
      unit_price: number | null;
      purchase_price: number;
      purchase_quantity: number;
      color: string | null;
    };
  }[];
}

const units = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (L)" },
  { value: "un", label: "Unidade (un)" },
];

export default function Recipes() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Business cost state
  const [totalBusinessCostPercent, setTotalBusinessCostPercent] = useState<number | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  
  // Recipe form state
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState("1");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [cmvTarget, setCmvTarget] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchBusinessCosts = async (userId: string, monthlyRevenue: number | null) => {
    if (!monthlyRevenue || monthlyRevenue <= 0) {
      setTotalBusinessCostPercent(null);
      return;
    }

    const [{ data: fixedData }, { data: variableData }] = await Promise.all([
      supabase.from("fixed_expenses").select("monthly_value").eq("user_id", userId),
      supabase.from("variable_expenses").select("monthly_value").eq("user_id", userId),
    ]);

    const fixedTotal = fixedData?.reduce((sum, e) => sum + Number(e.monthly_value), 0) || 0;
    const variableTotal = variableData?.reduce((sum, e) => sum + Number(e.monthly_value), 0) || 0;
    const totalExpenses = fixedTotal + variableTotal;
    const percent = (totalExpenses / monthlyRevenue) * 100;
    
    setTotalBusinessCostPercent(percent);
  };

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
      await Promise.all([
        fetchIngredients(session.user.id),
        fetchRecipes(session.user.id),
        fetchBusinessCosts(session.user.id, profileData.monthly_revenue ? Number(profileData.monthly_revenue) : null),
      ]);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchIngredients = async (userId: string) => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true });

    if (!error && data) {
      setIngredients(data as IngredientData[]);
    }
  };

  const fetchRecipes = async (userId: string) => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecipes(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const resetForm = () => {
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([createEmptyIngredient()]);
    setCmvTarget(profile?.default_cmv?.toString() || "30");
    setEditingId(null);
    setShowForm(false);
  };

  const handleNewRecipe = () => {
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([createEmptyIngredient()]);
    setCmvTarget(profile?.default_cmv?.toString() || "30");
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    // Fetch recipe with ingredients
    const { data, error } = await supabase
      .from("recipe_ingredients")
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
      .eq("recipe_id", recipe.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os ingredientes", variant: "destructive" });
      return;
    }

    const loadedIngredients: RecipeIngredient[] = data.map((ri: any) => {
      // SEMPRE usar unit_price atual do insumo (já inclui F.C aplicado no banco)
      const unitPrice = ri.ingredients?.unit_price ?? 
        ((ri.ingredients?.purchase_price ?? 0) / (ri.ingredients?.purchase_quantity ?? 1));
      
      const qty = parseFloat(ri.quantity) || 0;
      // Recalcular custo com base no preço ATUAL do insumo, não o valor salvo
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
        cost: recalculatedCost, // Usar custo recalculado, não o armazenado
        color: ri.ingredients?.color || null,
      };
    });

    setRecipeName(recipe.name);
    setServings(recipe.servings.toString());
    setCmvTarget(recipe.cmv_target?.toString() || "30");
    setRecipeIngredients(loadedIngredients.length > 0 ? loadedIngredients : [createEmptyIngredient()]);
    setEditingId(recipe.id);
    setShowForm(true);
  };

  const handleDeleteClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeToDelete.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir a ficha técnica", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Ficha técnica removida!" });
      await fetchRecipes(user.id);
    }

    setDeleteDialogOpen(false);
    setRecipeToDelete(null);
  };

  const createEmptyIngredient = (): RecipeIngredient => ({
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
  });

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

  const totalCost = recipeIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  const costPerServing = totalCost / (parseInt(servings) || 1);
  
  // Nova fórmula: Preço = Custo / (CMV desejado / 100)
  const cmv = parseFloat(cmvTarget) || 30;
  const suggestedPrice = cmv > 0 && cmv < 100 
    ? costPerServing / (cmv / 100) 
    : costPerServing;
  const profit = suggestedPrice - costPerServing;
  const realMargin = suggestedPrice > 0 ? ((profit / suggestedPrice) * 100) : 0;

  // Cálculo do Custo Fixo + Variável por item
  // Valor R$ = Preço de Venda × Percentual Total
  const businessCostPerItem = totalBusinessCostPercent !== null && suggestedPrice > 0
    ? suggestedPrice * (totalBusinessCostPercent / 100)
    : null;

  // Cálculo da Margem Real do Produto
  // Margem R$ = Preço de Venda − Custo com perda − Valor do Custo Fixo + Variável
  // Margem % = Margem R$ ÷ Preço de Venda
  const realMarginValue = businessCostPerItem !== null && suggestedPrice > 0
    ? suggestedPrice - costPerServing - businessCostPerItem
    : null;
  const realMarginPercent = realMarginValue !== null && suggestedPrice > 0
    ? (realMarginValue / suggestedPrice) * 100
    : null;

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      toast({ title: "Erro", description: "Informe o nome da ficha técnica", variant: "destructive" });
      return;
    }

    const validIngredients = recipeIngredients.filter((i) => i.ingredientId && parseFloat(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um insumo com quantidade", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const recipeData = {
        user_id: user.id,
        name: recipeName,
        servings: parseInt(servings) || 1,
        cmv_target: parseFloat(cmvTarget) || 30,
        total_cost: parseFloat(totalCost.toFixed(2)),
        cost_per_serving: parseFloat(costPerServing.toFixed(2)),
        suggested_price: parseFloat(suggestedPrice.toFixed(2)),
      };

      let recipeId = editingId;

      if (editingId) {
        // Update existing recipe
        const { error: updateError } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", editingId);

        if (updateError) throw updateError;

        // Delete existing ingredients
        const { error: deleteError } = await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", editingId);

        if (deleteError) throw deleteError;
      } else {
        // Insert new recipe
        const { data: newRecipe, error: insertError } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select()
          .single();

        if (insertError) throw insertError;
        recipeId = newRecipe.id;
      }

      // Insert recipe ingredients
      const ingredientsData = validIngredients.map((ing) => ({
        recipe_id: recipeId!,
        ingredient_id: ing.ingredientId!,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
        cost: parseFloat(ing.cost.toFixed(2)),
      }));

      const { error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientsData);

      if (ingredientsError) throw ingredientsError;

      toast({ 
        title: editingId ? "Ficha atualizada!" : "Ficha técnica criada! 🎉", 
        description: `CMV: R$ ${totalCost.toFixed(2)} | Preço sugerido: R$ ${suggestedPrice.toFixed(2)}` 
      });
      
      await fetchRecipes(user.id);
      resetForm();
    } catch (error: any) {
      toast({ 
        title: "Erro ao salvar", 
        description: error.message || "Não foi possível salvar a ficha técnica", 
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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business" },
    { icon: Package, label: "Insumos", path: "/ingredients" },
    { icon: Wine, label: "Bebidas", path: "/beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "/recipes", active: true },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="font-logo text-primary-foreground text-sm">P</span>
              </div>
              <span className="font-logo text-xl text-foreground">PRECIFY</span>
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {!item.active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary text-sm">{user?.email?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{profile?.business_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Fichas Técnicas</h1>
                <p className="text-sm text-muted-foreground">Crie e gerencie receitas com cálculo de CMV</p>
              </div>
            </div>
            <Button className="gap-2" onClick={handleNewRecipe}>
              <Plus className="w-4 h-4" />
              Nova Ficha
            </Button>
          </div>
        </header>

        <div className="p-6">
          {showForm ? (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {editingId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
                    </h2>
                    <p className="text-sm text-muted-foreground">Selecione insumos pelo código para montagem rápida</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Dica de uso */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Dica: Use o código do insumo</p>
                  <p className="text-muted-foreground">
                    Digite o número do insumo (ex: 1) para selecionar rapidamente. O custo é calculado automaticamente
                    baseado na quantidade usada. Ex: 50g de um insumo a R$ 11,20/kg = R$ 0,56
                  </p>
                </div>
              </div>

              {/* Recipe info */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    placeholder="Ex: X-Bacon Especial"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rendimento (porções)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </div>

              {/* Ingredients list */}
              <div className="space-y-3 mb-6">
                <Label>Ingredientes da Receita</Label>
                
                {recipeIngredients.map((ing, index) => (
                  <div
                    key={ing.id}
                    className="grid grid-cols-12 gap-3 items-end p-4 bg-muted/50 rounded-lg"
                  >
                    {/* Ingredient selector */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Insumo (busque por código ou nome)
                      </Label>
                      <IngredientSelector
                        ingredients={ingredients}
                        onSelect={(selected) => handleSelectIngredient(index, selected)}
                        selectedId={ing.ingredientId || undefined}
                        placeholder="Digite 1 ou nome..."
                      />
                      {ing.ingredientCode && (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-primary flex items-center gap-1.5">
                            <ColorDot color={ing.color} size="sm" />
                            <span className="font-mono font-semibold">{ing.ingredientCode}</span>
                            <span>-</span>
                            <span>{ing.name}</span>
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(ing.unitPrice)}/{ing.baseUnit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="50"
                        value={ing.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Unidade</Label>
                      <Select
                        value={ing.unit}
                        onValueChange={(value) => handleUnitChange(index, value)}
                      >
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

                    {/* Cost (calculated) */}
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Custo</Label>
                      <div className="h-9 px-3 py-2 bg-background border border-input rounded-md flex items-center">
                        <span className={`text-sm font-medium ${ing.cost > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {formatCurrency(ing.cost)}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-9 w-9"
                        onClick={() => removeIngredientRow(index)}
                        disabled={recipeIngredients.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-dashed"
                  onClick={addIngredientRow}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar ingrediente
                </Button>
              </div>

              {/* Cost Summary */}
              <div className="bg-primary/5 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Calculator className="w-5 h-5" />
                  <span className="font-medium">Resumo de Custos (CMV)</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total da Receita</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo por Porção (CMV)</p>
                    <p className="font-display text-2xl font-bold text-primary">
                      {formatCurrency(costPerServing)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-success mb-3">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Precificação</span>
                </div>
                
                <div className="grid sm:grid-cols-4 gap-4 items-end">
                  {/* CMV input */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      CMV Desejado
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={cmvTarget}
                        onChange={(e) => setCmvTarget(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    {profile?.default_cmv && (
                      <p className="text-xs text-muted-foreground">
                        Padrão do negócio: {profile.default_cmv}%
                      </p>
                    )}
                  </div>

                  {/* Suggested price */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Preço de Venda</p>
                    <p className="font-display text-2xl font-bold text-success">
                      {formatCurrency(suggestedPrice)}
                    </p>
                  </div>

                  {/* Profit */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Lucro por Porção
                    </p>
                    <p className="font-display text-xl font-bold text-foreground">
                      {formatCurrency(profit)}
                    </p>
                  </div>

                  {/* CMV percentage */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CMV %</p>
                    <p className="font-display text-xl font-bold text-muted-foreground">
                      {suggestedPrice > 0 ? ((costPerServing / suggestedPrice) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Cost per Item Section */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-600 mb-3">
                  <Building2Icon className="w-5 h-5" />
                  <span className="font-medium">Custo Fixo + Variável por Item</span>
                </div>
                
                {totalBusinessCostPercent !== null ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Percentual do Negócio
                      </p>
                      <p className="font-display text-2xl font-bold text-amber-600">
                        {totalBusinessCostPercent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Custos fixos + variáveis sobre faturamento
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Valor por Item Vendido
                      </p>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {businessCostPerItem !== null ? formatCurrency(businessCostPerItem) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Preço de venda × {totalBusinessCostPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Configure o faturamento mensal e despesas na{" "}
                      <button 
                        onClick={() => navigate("/business")}
                        className="text-primary hover:underline font-medium"
                      >
                        Área do Negócio
                      </button>{" "}
                      para visualizar este cálculo.
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> Este percentual representa quanto do valor de cada item vendido será usado 
                    para pagar as despesas fixas e variáveis do negócio. <strong>Não interfere no cálculo do preço de venda</strong>, 
                    que é definido exclusivamente pelo CMV.
                  </p>
                </div>
              </div>

              {/* Real Margin Section */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-emerald-600 mb-3">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Margem Real do Produto</span>
                </div>
                
                {realMarginValue !== null && realMarginPercent !== null ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Margem R$
                      </p>
                      <p className={`font-display text-2xl font-bold ${realMarginValue >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {formatCurrency(realMarginValue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Preço − Custo − Despesas
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Margem %
                      </p>
                      <p className={`font-display text-2xl font-bold ${realMarginPercent >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {realMarginPercent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Margem R$ ÷ Preço de Venda
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Configure o faturamento mensal e despesas na{" "}
                      <button 
                        onClick={() => navigate("/business")}
                        className="text-primary hover:underline font-medium"
                      >
                        Área do Negócio
                      </button>{" "}
                      para visualizar a margem real.
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Fórmula:</strong> Margem R$ = Preço de Venda − Custo com perda − Custo Fixo + Variável por item. 
                    Este é o lucro real após cobrir todos os custos diretos e indiretos.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveRecipe} disabled={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? "Salvando..." : "Salvar Ficha Técnica"}
                </Button>
              </div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Nenhuma ficha técnica cadastrada</h3>
              <p className="text-muted-foreground mb-6">
                Crie fichas técnicas para calcular o CMV e precificar seus produtos.
              </p>
              <Button onClick={handleNewRecipe}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Ficha Técnica
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Porções</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">CMV/Porção</TableHead>
                    <TableHead className="text-right">CMV</TableHead>
                    <TableHead className="text-right">Preço Sugerido</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell className="text-center">{recipe.servings}</TableCell>
                      <TableCell className="text-right">{formatCurrency(recipe.total_cost)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(recipe.cost_per_serving)}
                      </TableCell>
                      <TableCell className="text-right">{recipe.cmv_target}%</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(recipe.suggested_price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditRecipe(recipe)}
                            title="Editar ficha"
                            className="hover:bg-primary/10 hover:text-primary h-9 w-9 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0" 
                            onClick={() => handleDeleteClick(recipe)}
                            title="Excluir ficha"
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
        </div>
      </main>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ficha técnica{" "}
              <span className="font-semibold text-foreground">
                "{recipeToDelete?.name}"
              </span>
              ? Esta ação não pode ser desfeita.
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
    </div>
  );
}
