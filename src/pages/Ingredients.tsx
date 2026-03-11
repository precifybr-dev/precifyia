import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Wine,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  HelpCircle,
  Calculator,
  AlertTriangle,
  Sparkles,
  Sun,
  Moon,
  RefreshCw
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatIngredientCode, calculateIngredientCost } from "@/lib/ingredient-utils";
import { normalizeText } from "@/lib/utils";
import { ColorPicker, ColorDot } from "@/components/ui/color-picker";
import { SpreadsheetImportModal } from "@/components/spreadsheet-import/SpreadsheetImportModal";
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useStore } from "@/contexts/StoreContext";
import { DeleteIngredientDialog } from "@/components/ingredients/DeleteIngredientDialog";
import { SearchAndFilter } from "@/components/ui/SearchAndFilter";
import { useShell } from "@/components/layout/AppShell";
import type { IngredientData } from "@/components/recipes/IngredientSelector";

type Ingredient = {
  id: string;
  code: number;
  name: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  unit_price: number | null;
  correction_factor: number | null;
  color: string | null;
};

const units = [
  { value: "un", label: "Unidade (un)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "dz", label: "Dúzia (dz)" },
];

export default function Ingredients() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    unit: "un",
    purchase_quantity: "",
    purchase_price: "",
    correction_factor: "1",
    color: null as string | null,
  });
  const [fcCalculator, setFcCalculator] = useState({
    grossQuantity: "",
    netQuantity: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const { activeStore } = useStore();
  const { openSidebar } = useShell();


  // Memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Filtered and sorted ingredients (busca sem acentos)
  const filteredIngredients = useMemo(() => {
    let result = [...ingredients];
    
    // Search by name (normalizada - ignora acentos)
    if (searchTerm) {
      const searchNormalized = normalizeText(searchTerm);
      result = result.filter(ing => 
        normalizeText(ing.name).includes(searchNormalized)
      );
    }
    
    // Filter by color
    if (selectedColor) {
      result = result.filter(ing => ing.color === selectedColor);
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
        result.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
        break;
      case "cost-desc":
        result.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0));
        break;
      default:
        // Keep original order (by code)
        break;
    }
    
    return result;
  }, [ingredients, searchTerm, selectedColor, sortOption]);

  // Calcula o F.C automaticamente quando os valores mudam
  const calculateFC = () => {
    const gross = parseFloat(fcCalculator.grossQuantity);
    const net = parseFloat(fcCalculator.netQuantity);
    if (gross > 0 && net > 0 && net <= gross) {
      const fc = (gross / net).toFixed(2);
      setFormData({ ...formData, correction_factor: fc });
      toast({
        title: "F.C calculado!",
        description: `Fator de Correção: ${fc}`,
      });
    } else if (net > gross) {
      toast({
        title: "Valores inválidos",
        description: "A quantidade líquida não pode ser maior que a bruta",
        variant: "destructive",
      });
    }
  };

  // Calcula o custo unitário com F.C em tempo real
  const calculateUnitPrice = () => {
    const qty = parseFloat(formData.purchase_quantity) || 0;
    const price = parseFloat(formData.purchase_price) || 0;
    const fc = parseFloat(formData.correction_factor) || 1;
    if (qty > 0 && price > 0) {
      return ((price / qty) * fc).toFixed(2);
    }
    return "—";
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
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Re-fetch ingredients when activeStore changes
  useEffect(() => {
    if (user?.id) {
      fetchIngredients(user.id, activeStore?.id);
    }
  }, [user?.id, activeStore?.id]);

  const fetchIngredients = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true });
    
    // Filter by store if available
    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setIngredients(data);
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

  const getNextCode = () => {
    if (ingredients.length === 0) return 1;
    const maxCode = Math.max(...ingredients.map(ing => ing.code));
    return maxCode + 1;
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", unit: "un", purchase_quantity: "", purchase_price: "", correction_factor: "1", color: null });
    setFcCalculator({ grossQuantity: "", netQuantity: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.purchase_quantity || !formData.purchase_price) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const codeNum = parseInt(formData.code);
    if (isNaN(codeNum) || codeNum < 1) {
      toast({ title: "Erro", description: "O número deve ser um inteiro maior que zero", variant: "destructive" });
      return;
    }

    // Verificar duplicidade de código
    const existingCode = ingredients.find(
      ing => ing.code === codeNum && ing.id !== editingId
    );
    if (existingCode) {
      toast({
        title: "Número já existe",
        description: `O insumo "${existingCode.name}" já usa o número ${codeNum}`,
        variant: "destructive",
      });
      return;
    }

    const ingredientData = {
      user_id: user.id,
      store_id: activeStore?.id || null,
      code: codeNum,
      name: formData.name,
      unit: formData.unit,
      purchase_quantity: parseFloat(formData.purchase_quantity),
      purchase_price: parseFloat(formData.purchase_price),
      correction_factor: formData.correction_factor ? parseFloat(formData.correction_factor) : null,
      color: formData.color,
    };

    if (editingId) {
      const { error } = await supabase.from("ingredients").update(ingredientData).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
      } else {
        // Auto-recalculate recipes that use this ingredient
        const qty = parseFloat(formData.purchase_quantity) || 1;
        const fc = parseFloat(formData.correction_factor) || 1;
        const newUnitPrice = (parseFloat(formData.purchase_price) / qty) * fc;
        
        const { data: affectedRI } = await supabase
          .from("recipe_ingredients")
          .select("id, quantity, unit, recipe_id")
          .eq("ingredient_id", editingId);

        if (affectedRI && affectedRI.length > 0) {
          for (const ri of affectedRI) {
            const newCost = calculateIngredientCost(newUnitPrice, ri.quantity, ri.unit, formData.unit);
            await supabase.from("recipe_ingredients").update({ cost: newCost }).eq("id", ri.id);
          }
          // Recalculate affected recipes
          const recipeIds = [...new Set(affectedRI.map((ri) => ri.recipe_id))];
          for (const recipeId of recipeIds) {
            const { data: riData } = await supabase.from("recipe_ingredients").select("cost").eq("recipe_id", recipeId);
            if (riData) {
              const totalCost = riData.reduce((sum, r) => sum + (r.cost || 0), 0);
              const { data: recipeData } = await supabase.from("recipes").select("servings").eq("id", recipeId).single();
              const costPerServing = totalCost / (recipeData?.servings || 1);
              await supabase.from("recipes").update({ total_cost: totalCost, cost_per_serving: costPerServing }).eq("id", recipeId);
            }
          }
          toast({ title: "Sucesso", description: `Insumo atualizado! ${affectedRI.length} receitas recalculadas.` });
        } else {
          toast({ title: "Sucesso", description: "Insumo atualizado!" });
        }
        await fetchIngredients(user.id, activeStore?.id);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("ingredients").insert(ingredientData);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Insumo adicionado!" });
        await fetchIngredients(user.id, activeStore?.id);
        resetForm();
      }
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      code: ingredient.code.toString(),
      name: ingredient.name,
      unit: ingredient.unit,
      purchase_quantity: ingredient.purchase_quantity.toString(),
      purchase_price: ingredient.purchase_price.toString(),
      correction_factor: ingredient.correction_factor?.toString() || "1",
      color: ingredient.color || null,
    });
    setFcCalculator({ grossQuantity: "", netQuantity: "" });
    setEditingId(ingredient.id);
    setShowForm(true);
    
    toast({
      title: "Modo edição",
      description: `Editando: ${ingredient.name}`,
    });
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteClick = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteComplete = async () => {
    await fetchIngredients(user.id, activeStore?.id);
    setIngredientToDelete(null);
  };

  // Recalculate all recipe costs based on current ingredient prices
  const handleRecalculatePrices = async () => {
    if (!user?.id) return;
    setIsRecalculating(true);
    try {
      // Fetch all ingredients for this user
      const { data: allIngredients } = await supabase
        .from("ingredients")
        .select("id, unit, unit_price, purchase_price, purchase_quantity, correction_factor")
        .eq("user_id", user.id);

      if (!allIngredients) throw new Error("Erro ao buscar insumos");

      // Build a map of ingredient id -> unit_price
      const ingMap = new Map<string, { unitPrice: number; unit: string; correctionFactor: number }>();
      allIngredients.forEach((ing) => {
        const qty = ing.purchase_quantity || 1;
        const fc = ing.correction_factor || 1;
        const unitPrice = ing.unit_price || ((ing.purchase_price / qty) * fc);
        ingMap.set(ing.id, { unitPrice, unit: ing.unit, correctionFactor: fc });
      });

      // Fetch all recipe_ingredients for this user's recipes
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id")
        .eq("user_id", user.id);

      if (!recipes || recipes.length === 0) {
        toast({ title: "Nenhuma ficha técnica", description: "Cadastre fichas técnicas para recalcular." });
        setIsRecalculating(false);
        return;
      }

      const recipeIds = recipes.map((r) => r.id);

      const { data: recipeIngredients } = await supabase
        .from("recipe_ingredients")
        .select("id, ingredient_id, quantity, unit, recipe_id")
        .in("recipe_id", recipeIds);

      if (!recipeIngredients) throw new Error("Erro ao buscar ingredientes das receitas");

      // Update each recipe_ingredient cost
      let updatedCount = 0;
      for (const ri of recipeIngredients) {
        const ing = ingMap.get(ri.ingredient_id);
        if (!ing) continue;

        const newCost = calculateIngredientCost(ing.unitPrice, ri.quantity, ri.unit, ing.unit);
        
        await supabase
          .from("recipe_ingredients")
          .update({ cost: newCost })
          .eq("id", ri.id);
        updatedCount++;
      }

      // Now recalculate each recipe's total_cost and cost_per_serving
      for (const recipe of recipes) {
        const { data: riData } = await supabase
          .from("recipe_ingredients")
          .select("cost")
          .eq("recipe_id", recipe.id);

        if (riData) {
          const totalCost = riData.reduce((sum, r) => sum + (r.cost || 0), 0);
          
          const { data: recipeData } = await supabase
            .from("recipes")
            .select("servings")
            .eq("id", recipe.id)
            .single();

          const servings = recipeData?.servings || 1;
          const costPerServing = totalCost / servings;

          await supabase
            .from("recipes")
            .update({ total_cost: totalCost, cost_per_serving: costPerServing })
            .eq("id", recipe.id);
        }
      }

      toast({
        title: "Preços atualizados!",
        description: `${updatedCount} itens recalculados em ${recipes.length} fichas técnicas.`,
      });
    } catch (err: any) {
      toast({ title: "Erro ao recalcular", description: err.message, variant: "destructive" });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Convert ingredients to IngredientData format for the selector
  const ingredientsForSelector: IngredientData[] = ingredients.map((ing) => ({
    id: ing.id,
    code: ing.code,
    name: ing.name,
    unit: ing.unit,
    unit_price: ing.unit_price,
    purchase_price: ing.purchase_price,
    purchase_quantity: ing.purchase_quantity,
    color: ing.color,
  }));

  // Handle iFood import - with global code calculation and retry logic
  const handleIfoodImport = async (items: { name: string; category?: string }[]) => {
    if (!user?.id || items.length === 0) return;

    // Helper function to get max code for the active store
    const getStoreMaxCode = async (): Promise<number> => {
      let query = supabase
        .from("ingredients")
        .select("code")
        .eq("user_id", user.id)
        .order("code", { ascending: false })
        .limit(1);
      
      if (activeStore?.id) {
        query = query.eq("store_id", activeStore.id);
      } else {
        query = query.is("store_id", null);
      }

      const { data: maxCodeData } = await query;
      return maxCodeData && maxCodeData.length > 0 ? maxCodeData[0].code : 0;
    };

    // Helper function to build ingredients with given startCode
    const buildIngredients = (startCode: number) => items.map((item, index) => ({
      user_id: user.id,
      store_id: activeStore?.id || null,
      code: startCode + index,
      name: item.name,
      unit: "un",
      purchase_quantity: 1,
      purchase_price: 0,
      correction_factor: 1,
      color: null,
    }));

    // First attempt
    let startCode = (await getStoreMaxCode()) + 1;
    let newIngredients = buildIngredients(startCode);

    const { error } = await supabase.from("ingredients").insert(newIngredients);
    
    if (error) {
      // Check if it's a uniqueness violation (Postgres error code 23505)
      const isUniquenessError = error.code === "23505" || 
        error.message?.includes("duplicate key") ||
        error.message?.includes("unique constraint");
      
      if (isUniquenessError) {
        console.warn("Code collision detected, retrying with fresh max code...");
        
        // Retry once with fresh max code
        startCode = (await getStoreMaxCode()) + 1;
        newIngredients = buildIngredients(startCode);
        
        const { error: retryError } = await supabase.from("ingredients").insert(newIngredients);
        
        if (retryError) {
          console.error("Import retry failed:", retryError);
          throw retryError;
        }
      } else {
        console.error("Import error:", error);
        throw error;
      }
    }
    
    toast({
      title: "Importação concluída!",
      description: `${items.length} insumos foram criados. Complete as informações de cada um.`,
    });
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business" },
    { icon: Package, label: "Insumos", path: "/ingredients", active: true },
    { icon: Wine, label: "Bebidas", path: "/beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "/recipes" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          {/* Row 1: Navigation + Title */}
          <div className="flex items-center gap-3 mb-2 sm:mb-0">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0" onClick={openSidebar}>
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="gap-1 px-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Insumos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Gerencie os ingredientes</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <StoreSwitcher />
            </div>
          </div>
          {/* Row 2: Actions - scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              sortOption={sortOption}
              onSortChange={setSortOption}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              showCostSort={true}
              showSellingSort={false}
              showColorFilter={true}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRecalculatePrices}
              disabled={isRecalculating}
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10 flex-shrink-0 text-xs sm:text-sm"
              title="Recalcular custos de todas as fichas técnicas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRecalculating ? "Recalculando..." : "Atualizar Fichas"}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="gap-1.5 text-muted-foreground flex-shrink-0 text-xs sm:text-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar (IA)</span>
              <span className="sm:hidden">Planilha</span>
            </Button>
            <Button size="sm" onClick={() => {
              setFormData({ ...formData, code: getNextCode().toString() });
              setShowForm(true);
            }} className="gap-1.5 flex-shrink-0 text-xs sm:text-sm">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Insumo</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </header>

        <div className="p-3 sm:p-6">
          {showForm && (
            <div ref={formRef} className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{editingId ? "Editar Insumo" : "Novo Insumo"}</h3>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                  <Label>Nº *</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={formData.code} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, code: value });
                    }}
                    placeholder="1" 
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Farinha de Trigo" />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
                <div>
                  <Label>Quantidade *</Label>
                  <Input type="number" step="0.01" value={formData.purchase_quantity} onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })} placeholder="1.00" />
                </div>
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="10.00" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Label className="mb-0">F.C</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-4">
                          <p className="font-semibold mb-2">Fator de Correção (F.C)</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Usado para ajustar perdas no preparo dos alimentos.
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Exemplo:</strong> Você compra 1 kg bruto de um alimento, mas após limpeza sobram 800 g.
                          </p>
                          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            F.C = 1 ÷ 0,8 = 1,25
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Esse fator garante que o custo unitário reflita o custo real do produto.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-primary transition-colors ml-1" title="Calculadora de F.C">
                          <Calculator className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">Calculadora de F.C</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Quantidade Bruta</Label>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ex: 1000" 
                                value={fcCalculator.grossQuantity}
                                onChange={(e) => setFcCalculator({ ...fcCalculator, grossQuantity: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantidade Líquida</Label>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ex: 800" 
                                value={fcCalculator.netQuantity}
                                onChange={(e) => setFcCalculator({ ...fcCalculator, netQuantity: e.target.value })}
                              />
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            size="sm" 
                            className="w-full" 
                            onClick={calculateFC}
                            disabled={!fcCalculator.grossQuantity || !fcCalculator.netQuantity}
                          >
                            Calcular F.C
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            F.C = Bruto ÷ Líquido
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="1"
                    value={formData.correction_factor} 
                    onChange={(e) => setFormData({ ...formData, correction_factor: e.target.value })} 
                    placeholder="1.00" 
                  />
                </div>
              </div>
              
              {/* Seletor de cor */}
              <div className="mt-4">
                <Label className="mb-2 block">Cor (opcional)</Label>
                <ColorPicker 
                  value={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use cores para categorizar seus insumos (ex: verde para vegetais, vermelho para carnes)
                </p>
              </div>
              
              {/* Preview do custo unitário calculado */}
              {formData.purchase_quantity && formData.purchase_price && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Custo unitário calculado:</span>
                    <span className="font-semibold text-primary text-lg">R$ {calculateUnitPrice()}/{formData.unit}</span>
                  </div>
                  {parseFloat(formData.correction_factor) > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Inclui F.C de {formData.correction_factor} (ajuste de perdas)
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cód.</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">F.C</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {ingredients.length === 0 
                        ? "Nenhum insumo cadastrado. Clique em \"Novo Insumo\" para começar."
                        : "Nenhum insumo encontrado com os filtros selecionados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIngredients.map((ing) => (
                    <TableRow key={ing.id} className={editingId === ing.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}>
                      <TableCell className="font-mono text-primary font-semibold">
                        <div className="flex items-center gap-2">
                          <ColorDot color={ing.color} size="md" />
                          {ing.code}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                      <TableCell className="text-right">{ing.purchase_quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {ing.purchase_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {ing.correction_factor && ing.correction_factor > 1 ? (
                          <span className="text-primary font-medium">{ing.correction_factor.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">1.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        R$ {ing.unit_price?.toFixed(2) || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(ing)}
                            title="Editar insumo"
                            className="hover:bg-primary/10 hover:text-primary h-9 w-9 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0" 
                            onClick={() => handleDeleteClick(ing)}
                            title="Excluir insumo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      

      {/* Dialog de confirmação de exclusão com contagem e substituição */}
      <DeleteIngredientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ingredient={ingredientToDelete}
        allIngredients={ingredientsForSelector}
        onDeleted={handleDeleteComplete}
      />

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        userId={user?.id || ""}
        storeId={activeStore?.id || null}
        existingIngredients={ingredients}
        onImportComplete={async () => {
          await fetchIngredients(user.id, activeStore?.id);
        }}
      />
    </>
  );
}
