import { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronDown,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Pencil,
  AlertTriangle,
  ChefHat,
  Sparkles,
  Sun,
  Moon,
  Copy,
  Store as StoreIcon,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import PricingSummaryPanel from "@/components/recipes/PricingSummaryPanel";
import { IfoodImportModal } from "@/components/ifood-import/IfoodImportModal";
import { useIfoodImport } from "@/hooks/useIfoodImport";
import { useRecipePricing } from "@/hooks/useRecipePricing";
import type { Tables } from "@/integrations/supabase/types";
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useStore } from "@/contexts/StoreContext";
import { SearchAndFilter } from "@/components/ui/SearchAndFilter";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useDataProtection } from "@/hooks/useDataProtection";
import { usePackagings } from "@/hooks/usePackagings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";


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
  correctionFactor?: number | null;
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
      correction_factor: number | null;
    };
  }[];
}

export default function Recipes() {
  const { activeStore, stores } = useStore();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fichasSubmenuOpen, setFichasSubmenuOpen] = useState(true);
  
  // Business cost state (expenses as % of revenue)
  const [totalBusinessCostPercent, setTotalBusinessCostPercent] = useState<number | null>(null);
  const [totalFixedExpenses, setTotalFixedExpenses] = useState<number>(0);
  // Production costs as % of monthly revenue (fixed + variable)
  const [productionCostsPercent, setProductionCostsPercent] = useState<number | null>(null);
  // iFood real percentage from profile
  const [ifoodRealPercentage, setIfoodRealPercentage] = useState<number | null>(null);
  // Tax percentage from business area configuration
  const [taxPercentage, setTaxPercentage] = useState<number | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  
  // Duplicate dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [recipeToDuplicate, setRecipeToDuplicate] = useState<Recipe | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // iFood import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  
  // Recipe form state
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState("1");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [cmvTarget, setCmvTarget] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // NEW STATES for pricing panel
  const [sellingPrice, setSellingPrice] = useState("");
  const [lossPercent, setLossPercent] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("5");
  const [localIfoodRate, setLocalIfoodRate] = useState("");
  const [ifoodSellingPrice, setIfoodSellingPrice] = useState(""); // Preço de venda opcional no iFood
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  // Packaging & Market Analysis state
  const [includePackaging, setIncludePackaging] = useState(false);
  const [selectedPackagingId, setSelectedPackagingId] = useState<string | null>(null);
  const [marketPriceMin, setMarketPriceMin] = useState("");
  const [marketPriceAvg, setMarketPriceAvg] = useState("");
  const [marketPriceMax, setMarketPriceMax] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { softDelete } = useDataProtection();
  const { activePackagings } = usePackagings();
  
  // Backend pricing hook
  const { result: pricingResult, isCalculating, error: pricingError, calculate: calculatePricing, reset: resetPricing } = useRecipePricing();
  
  // Hook for iFood import functionality
  const { userPlan, canImport, remainingUsage, checkUsage } = useIfoodImport({
    userId: user?.id || null,
    importType: "recipes",
  });

  // Memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Plan limits for recipes
  const getRecipeLimit = useCallback((plan: string | null): number | null => {
    switch (plan?.toLowerCase()) {
      case "free":
        return 3;
      case "basic":
      case "básico":
        return 8;
      case "pro":
        return null; // Unlimited
      default:
        return 3; // Default to free plan limits
    }
  }, []);

  const recipeLimit = useMemo(() => getRecipeLimit(profile?.user_plan), [profile?.user_plan, getRecipeLimit]);
  const canCreateRecipe = useMemo(() => {
    if (recipeLimit === null) return true; // Unlimited
    return recipes.length < recipeLimit;
  }, [recipes.length, recipeLimit]);

  // Filtered and sorted recipes (busca sem acentos)
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];
    
    // Search by name (normalizada - ignora acentos)
    if (searchTerm) {
      const searchNormalized = normalizeText(searchTerm);
      result = result.filter(recipe => 
        normalizeText(recipe.name).includes(searchNormalized)
      );
    }
    
    // Filter by color - recipes don't have individual colors, 
    // but we can filter by CMV status (green = good, red = bad)
    // For now, we skip color filtering for recipes since they don't have a color property
    
    // Sort
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "cost-asc":
        result.sort((a, b) => (a.cost_per_serving || 0) - (b.cost_per_serving || 0));
        break;
      case "cost-desc":
        result.sort((a, b) => (b.cost_per_serving || 0) - (a.cost_per_serving || 0));
        break;
      default:
        // Keep original order (by created_at)
        break;
    }
    
    return result;
  }, [recipes, searchTerm, sortOption]);

  const fetchBusinessCosts = async (userId: string, monthlyRevenue: number | null) => {
    // Fetch production costs and tax data
    const [{ data: fixedCostsData }, { data: variableCostsData }, { data: taxData }] = await Promise.all([
      supabase.from("fixed_costs").select("value_per_item").eq("user_id", userId),
      supabase.from("variable_costs").select("value_per_item").eq("user_id", userId),
      supabase.from("business_taxes").select("tax_percentage").eq("user_id", userId).maybeSingle(),
    ]);

    const fixedCostsTotal = fixedCostsData?.reduce((sum, c) => sum + Number(c.value_per_item), 0) || 0;
    const variableCostsTotal = variableCostsData?.reduce((sum, c) => sum + Number(c.value_per_item), 0) || 0;
    const totalProductionCosts = fixedCostsTotal + variableCostsTotal;
    
    // Convert production costs to % of monthly revenue (NOT absolute R$)
    if (monthlyRevenue && monthlyRevenue > 0 && totalProductionCosts > 0) {
      setProductionCostsPercent((totalProductionCosts / monthlyRevenue) * 100);
    } else {
      setProductionCostsPercent(totalProductionCosts > 0 ? null : 0);
    }
    
    // Set tax percentage from business configuration
    setTaxPercentage(taxData?.tax_percentage ? Number(taxData.tax_percentage) : null);

    // Fetch business expenses (% of revenue)
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
    setTotalFixedExpenses(fixedTotal);
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
      // Set iFood real percentage from profile
      setIfoodRealPercentage(profileData.ifood_real_percentage ? Number(profileData.ifood_real_percentage) : null);
      // Only fetch business costs on initial load; ingredients & recipes will be fetched by activeStore effect
      await fetchBusinessCosts(session.user.id, profileData.monthly_revenue ? Number(profileData.monthly_revenue) : null);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Realtime subscription for production costs (CF + CV)
  useEffect(() => {
    if (!user?.id || !profile?.monthly_revenue) return;

    const monthlyRevenue = Number(profile.monthly_revenue);

    const channel = supabase
      .channel('production-costs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixed_costs', filter: `user_id=eq.${user.id}` },
        () => { fetchBusinessCosts(user.id, monthlyRevenue); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variable_costs', filter: `user_id=eq.${user.id}` },
        () => { fetchBusinessCosts(user.id, monthlyRevenue); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.monthly_revenue]);

  // Re-fetch data when activeStore changes
  useEffect(() => {
    if (user?.id) {
      fetchIngredients(user.id, activeStore?.id);
      fetchRecipes(user.id, activeStore?.id);
    }
  }, [user?.id, activeStore?.id]);

  const fetchIngredients = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("ingredients")
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
      setIngredients(data as IngredientData[]);
    }
  };

  const fetchRecipes = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.is("store_id", null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRecipes(data);
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

  const resetForm = () => {
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([createEmptyIngredient()]);
    setCmvTarget(profile?.default_cmv?.toString() || "30");
    setEditingId(null);
    setShowForm(false);
    // Reset new states
    setSellingPrice("");
    setLossPercent("0");
    setDiscountPercent("5");
    setLocalIfoodRate("");
    setIfoodSellingPrice("");
    // Reset backend pricing
    resetPricing();
    // Reset packaging & market
    setIncludePackaging(false);
    setSelectedPackagingId(null);
    setMarketPriceMin("");
    setMarketPriceAvg("");
    setMarketPriceMax("");
  };

  const handleNewRecipe = () => {
    if (!canCreateRecipe) {
      toast({
        title: "Limite atingido",
        description: `Seu plano ${profile?.user_plan || 'Free'} permite apenas ${recipeLimit} ficha${recipeLimit !== 1 ? 's' : ''} técnica${recipeLimit !== 1 ? 's' : ''}. Faça upgrade para cadastrar mais.`,
        variant: "destructive",
      });
      return;
    }
    
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([createEmptyIngredient()]);
    setCmvTarget(profile?.default_cmv?.toString() || "30");
    setEditingId(null);
    setShowForm(true);
    // Reset new states
    setSellingPrice("");
    setLossPercent("0");
    setDiscountPercent("5");
    setLocalIfoodRate("");
    setIfoodSellingPrice("");
    setIncludePackaging(false);
    setSelectedPackagingId(null);
    setMarketPriceMin("");
    setMarketPriceAvg("");
    setMarketPriceMax("");
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
          color,
          correction_factor
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
        correctionFactor: ri.ingredients?.correction_factor || null,
      };
    });

    setRecipeName(recipe.name);
    setServings(recipe.servings.toString());
    setCmvTarget(recipe.cmv_target?.toString() || "30");
    setRecipeIngredients(loadedIngredients.length > 0 ? loadedIngredients : [createEmptyIngredient()]);
    setEditingId(recipe.id);
    setShowForm(true);
    // Load saved prices from database
    setSellingPrice((recipe as any).selling_price?.toString() || "");
    setLossPercent("0");
    setDiscountPercent("5");
    setLocalIfoodRate("");
    setIfoodSellingPrice(recipe.ifood_selling_price?.toString() || "");
    // Load packaging & market data
    const pkgId = (recipe as any).packaging_id || null;
    setIncludePackaging(!!pkgId);
    setSelectedPackagingId(pkgId);
    setMarketPriceMin((recipe as any).market_price_min?.toString() || "");
    setMarketPriceAvg((recipe as any).market_price_avg?.toString() || "");
    setMarketPriceMax((recipe as any).market_price_max?.toString() || "");
  };

  const handleDeleteClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (recipe: Recipe) => {
    setRecipeToDuplicate(recipe);
    setDuplicateName(`${recipe.name} (cópia)`);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!recipeToDuplicate || !user) return;

    setIsDuplicating(true);
    try {
      // Fetch the recipe's ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select("ingredient_id, quantity, unit, cost")
        .eq("recipe_id", recipeToDuplicate.id);

      if (ingredientsError) throw ingredientsError;

      const newName = duplicateName.trim() || `${recipeToDuplicate.name} (cópia)`;

      // Create new recipe with custom name - selling prices come as null (suggested price is kept)
      const { data: newRecipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          user_id: user.id,
          name: newName,
          servings: recipeToDuplicate.servings,
          total_cost: recipeToDuplicate.total_cost,
          cost_per_serving: recipeToDuplicate.cost_per_serving,
          suggested_price: recipeToDuplicate.suggested_price,
          cmv_target: recipeToDuplicate.cmv_target,
          selling_price: null,
          ifood_selling_price: null,
          store_id: recipeToDuplicate.store_id,
          packaging_id: (recipeToDuplicate as any).packaging_id || null,
        } as any)
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Duplicate ingredients for the new recipe
      if (ingredientsData && ingredientsData.length > 0) {
        const newIngredients = ingredientsData.map((ing) => ({
          recipe_id: newRecipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
          cost: ing.cost,
        }));

        const { error: insertError } = await supabase
          .from("recipe_ingredients")
          .insert(newIngredients);

        if (insertError) throw insertError;
      }

      toast({ title: "Sucesso", description: `"${newName}" foi criada!` });
      await fetchRecipes(user.id, activeStore?.id);
    } catch (error: any) {
      console.error("Error duplicating recipe:", error);
      toast({
        title: "Erro ao duplicar",
        description: error.message || "Não foi possível duplicar a ficha técnica",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
      setDuplicateDialogOpen(false);
      setRecipeToDuplicate(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;

    const { data: record } = await supabase.from("recipes").select("*").eq("id", recipeToDelete.id).single();
    if (record) {
      const success = await softDelete({ table: "recipes", id: recipeToDelete.id, data: record, storeId: activeStore?.id || null });
      if (success) {
        await fetchRecipes(user.id, activeStore?.id);
      }
    } else {
      toast({ title: "Erro", description: "Não foi possível encontrar a ficha técnica", variant: "destructive" });
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
    correctionFactor: null,
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

  // (packaging cost and calculation trigger below)

  // ============ PACKAGING COST ============
  const selectedPackaging = includePackaging && selectedPackagingId
    ? activePackagings.find(p => p.id === selectedPackagingId)
    : null;
  const packagingCost = selectedPackaging?.cost_total || 0;

  // ============ BACKEND CALCULATION TRIGGER ============
  // Trigger backend calculation whenever inputs change
  useEffect(() => {
    if (!showForm) return;
    
    const validIngredients = recipeIngredients
      .filter((i) => i.ingredientId && parseFloat(i.quantity) > 0)
      .map((i) => ({
        ingredient_id: i.ingredientId!,
        quantity: parseFloat(i.quantity),
        unit: i.unit,
      }));

    if (validIngredients.length === 0) return;

    calculatePricing({
      recipe_name: recipeName || "Nova Receita",
      ingredients: validIngredients,
      servings: parseInt(servings) || 1,
      cmv_target: parseFloat(cmvTarget) || 30,
      selling_price: sellingPrice.trim() ? parseFloat(sellingPrice) : null,
      ifood_selling_price: ifoodSellingPrice.trim() ? parseFloat(ifoodSellingPrice) : null,
      loss_percent: parseFloat(lossPercent) || 0,
      discount_percent: parseFloat(discountPercent) || 0,
      local_ifood_rate: localIfoodRate.trim() ? parseFloat(localIfoodRate) : null,
      packaging_cost: packagingCost,
    });
  }, [
    showForm, recipeIngredients, recipeName, servings, cmvTarget,
    sellingPrice, ifoodSellingPrice, lossPercent, discountPercent, localIfoodRate,
    calculatePricing, includePackaging, selectedPackagingId, packagingCost,
  ]);

  // ============ VALUES FROM BACKEND (or fallback while loading) ============
  const rawIngredientsCost = recipeIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  const ingredientsCost = rawIngredientsCost + packagingCost;
  const ingredientsCostPerServing = ingredientsCost / (parseInt(servings) || 1);

  // Use backend results when available, local fallback while calculating
  const costWithLoss = pricingResult?.cost_with_loss ?? ingredientsCostPerServing;
  const suggestedPrice = pricingResult?.suggested_price ?? 0;
  const finalSellingPrice = pricingResult?.final_selling_price ?? (parseFloat(sellingPrice) || suggestedPrice);
  const actualCMV = pricingResult?.actual_cmv ?? 0;
  const grossMargin = pricingResult?.gross_margin ?? 0;
  const grossMarginPercent = pricingResult?.gross_margin_percent ?? 0;
  const discountedPrice = pricingResult?.discounted_price ?? 0;
  const effectiveIfoodRate = pricingResult?.effective_ifood_rate ?? (parseFloat(localIfoodRate) || ifoodRealPercentage || 0);
  const suggestedIfoodPrice = pricingResult?.suggested_ifood_price ?? 0;
  const calculatedIfoodPrice = pricingResult?.calculated_ifood_price ?? 0;
  const ifoodPrice = pricingResult?.ifood_price ?? 0;
  
  // For save: use total ingredient cost
  const totalCost = pricingResult?.ingredients_cost_total ?? ingredientsCost;

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

    if (includePackaging && !selectedPackagingId) {
      toast({ title: "Erro", description: "Selecione uma embalagem ou desmarque a opção", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      // Use backend-calculated values when available
      const backendCostPerServing = pricingResult?.cost_with_loss ?? parseFloat(costWithLoss.toFixed(2));
      const backendSuggestedPrice = pricingResult?.suggested_price ?? parseFloat(suggestedPrice.toFixed(2));
      const backendTotalCost = pricingResult?.ingredients_cost_total ?? parseFloat(ingredientsCost.toFixed(2));
      const parsedIfoodPrice = ifoodSellingPrice.trim() ? parseFloat(ifoodSellingPrice) : null;

      const recipeData = {
        user_id: user.id,
        store_id: activeStore?.id || null,
        name: recipeName,
        servings: parseInt(servings) || 1,
        cmv_target: parseFloat(cmvTarget) || 30,
        total_cost: backendTotalCost,
        cost_per_serving: backendCostPerServing,
        suggested_price: backendSuggestedPrice,
        selling_price: sellingPrice.trim() !== "" ? parseFloat(sellingPrice) : null,
        ifood_selling_price: parsedIfoodPrice && parsedIfoodPrice > 0 ? parsedIfoodPrice : null,
        packaging_id: selectedPackagingId || null,
        market_price_min: marketPriceMin.trim() ? parseFloat(marketPriceMin) : null,
        market_price_avg: marketPriceAvg.trim() ? parseFloat(marketPriceAvg) : null,
        market_price_max: marketPriceMax.trim() ? parseFloat(marketPriceMax) : null,
      } as any;

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
      
      await fetchRecipes(user.id, activeStore?.id);
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

  // Handle iFood import for recipes
  const handleIfoodImport = async (items: { name: string; category?: string }[]) => {
    if (!user?.id || items.length === 0) return;

    const newRecipes = items.map((item) => ({
      user_id: user.id,
      store_id: activeStore?.id || null,
      name: item.name,
      servings: 1,
      cmv_target: profile?.default_cmv || 30,
      total_cost: 0,
      cost_per_serving: 0,
      suggested_price: 0,
    }));

    const { error } = await supabase.from("recipes").insert(newRecipes);
    if (error) {
      throw error;
    }
    
    toast({
      title: "Importação concluída!",
      description: `${items.length} fichas técnicas foram criadas. Adicione os insumos de cada uma.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} profile={profile} />

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          {/* Row 1: Navigation + Title */}
          <div className="flex items-center gap-3 mb-2 sm:mb-0">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                navigate("/app");
              }
            }} className="gap-1 px-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{showForm ? "Voltar para lista" : "Voltar"}</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Fichas Técnicas</h1>
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                  recipeLimit !== null && recipes.length >= recipeLimit 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {recipeLimit !== null 
                    ? `${recipes.length}/${recipeLimit}`
                    : `${recipes.length}`
                  }
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Receitas com cálculo de CMV</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <StoreSwitcher />
            </div>
          </div>
          {/* Row 2: Actions */}
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
              showColorFilter={false}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="gap-1.5 text-muted-foreground flex-shrink-0 text-xs sm:text-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar (IA)</span>
              <span className="sm:hidden">iFood</span>
            </Button>
            <Button 
              size="sm"
              className="gap-1.5 flex-shrink-0 text-xs sm:text-sm" 
              onClick={handleNewRecipe}
              disabled={!canCreateRecipe}
              title={!canCreateRecipe ? `Limite de ${recipeLimit} fichas atingido` : undefined}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Ficha</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
          
          {/* AI Import microcopy */}
          {canImport && userPlan !== "pro" && (
            <p className="text-xs text-muted-foreground mt-1.5 text-right">
              {remainingUsage} importação{remainingUsage !== 1 ? "ções" : ""} restante{remainingUsage !== 1 ? "s" : ""}
            </p>
          )}
        </header>

        <div className="p-3 sm:p-6">
          {showForm ? (
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">
                      {editingId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
                    </h2>
                    <p className="text-xs text-muted-foreground">Selecione insumos pelo código para montagem rápida</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Dica de uso */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-foreground mb-0.5">Dica: Use o código do insumo</p>
                  <p className="text-muted-foreground">
                    Digite o número do insumo (ex: 1) para selecionar rapidamente. Ex: 50g a R$ 11,20/kg = R$ 0,56
                  </p>
                </div>
              </div>

              {/* Recipe info - Header with Name, Servings, CMV */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Produto *</Label>
                  <Input
                    placeholder="Ex: X-Bacon Especial"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                  />
                </div>
                <div className="space-y-1 w-24">
                  <Label className="text-xs">Rendimento</Label>
                  <Input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
                <div className="space-y-1 w-28">
                  <Label className="text-xs">CMV Desejado (%)</Label>
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
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="mb-2">
                <Label className="mb-1.5 block text-sm">Tabela de Insumos</Label>
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

              {/* Packaging Toggle */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Switch
                    id="includePackaging"
                    checked={includePackaging}
                    onCheckedChange={(checked) => {
                      setIncludePackaging(!!checked);
                      if (!checked) setSelectedPackagingId(null);
                    }}
                  />
                  <Label htmlFor="includePackaging" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Adicionar embalagem ao produto
                  </Label>
                </div>

                {includePackaging && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <Select
                      value={selectedPackagingId || "none"}
                      onValueChange={(v) => setSelectedPackagingId(v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar embalagem..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecionar embalagem...</SelectItem>
                        {activePackagings.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} — {formatCurrency(pkg.cost_total)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPackagingId && (() => {
                      const pkg = activePackagings.find(p => p.id === selectedPackagingId);
                      const currentPrice = parseFloat(sellingPrice) || suggestedPrice;
                      const pctOfPrice = currentPrice > 0 && pkg ? (pkg.cost_total / currentPrice * 100) : 0;
                      return pkg ? (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo embalagem:</span>
                            <span className="font-semibold">{formatCurrency(pkg.cost_total)}</span>
                          </div>
                          {currentPrice > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">% sobre preço:</span>
                              <span className={`font-semibold ${pctOfPrice > 15 ? "text-destructive" : pctOfPrice > 10 ? "text-warning" : "text-success"}`}>
                                {pctOfPrice.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                    {activePackagings.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma embalagem ativa. Cadastre em Embalagens no menu lateral.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Summary Panel */}
              <div className="mb-4">
              <PricingSummaryPanel
                  ingredientsCost={pricingResult?.ingredients_cost_per_serving ?? ingredientsCostPerServing}
                  costWithLoss={costWithLoss}
                  productionCostsPercent={pricingResult?.production_costs_percent ?? productionCostsPercent}
                  cmvTarget={cmvTarget}
                  setCmvTarget={setCmvTarget}
                  actualCMV={actualCMV}
                  defaultCmv={profile?.default_cmv}
                  sellingPrice={sellingPrice}
                  setSellingPrice={setSellingPrice}
                  suggestedPrice={suggestedPrice}
                  lossPercent={lossPercent}
                  setLossPercent={setLossPercent}
                  grossMargin={grossMargin}
                  grossMarginPercent={grossMarginPercent}
                  ifoodPrice={ifoodPrice}
                  suggestedIfoodPrice={suggestedIfoodPrice}
                  calculatedIfoodPrice={calculatedIfoodPrice}
                  localIfoodRate={localIfoodRate}
                  setLocalIfoodRate={setLocalIfoodRate}
                  ifoodRealPercentage={ifoodRealPercentage}
                  discountPercent={discountPercent}
                  setDiscountPercent={setDiscountPercent}
                  discountedPrice={discountedPrice}
                  
                  ifoodSellingPrice={ifoodSellingPrice}
                  setIfoodSellingPrice={setIfoodSellingPrice}
                  taxPercentage={pricingResult?.tax_percentage ?? taxPercentage}
                  
                  isCalculating={isCalculating}
                  calculationError={pricingError}
                  pricingResult={pricingResult}
                  packagingCost={packagingCost}
                  rawIngredientsCost={rawIngredientsCost / (parseInt(servings) || 1)}
                  totalFixedExpenses={totalFixedExpenses}
                />
              </div>

              {/* Market Analysis */}
              <Accordion type="multiple" className="mb-2">
                {/* Análise de Mercado */}
                <AccordionItem value="market">
                  <AccordionTrigger className="text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Análise de Mercado
                      {(() => {
                        const avg = parseFloat(marketPriceAvg);
                        const price = parseFloat(sellingPrice) || suggestedPrice;
                        if (!avg || !price) return null;
                        const diff = ((price - avg) / avg) * 100;
                        const status = diff < -10 ? "Abaixo" : diff > 10 ? "Acima" : "Na média";
                        const color = diff < -10 ? "bg-primary/10 text-primary" : diff > 10 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success";
                        return (
                          <Badge variant="outline" className={`text-xs ml-2 ${color}`}>
                            {status} ({diff > 0 ? "+" : ""}{diff.toFixed(0)}%)
                          </Badge>
                        );
                      })()}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Mínimo (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={marketPriceMin}
                            onChange={(e) => setMarketPriceMin(e.target.value)}
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Médio (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={marketPriceAvg}
                            onChange={(e) => setMarketPriceAvg(e.target.value)}
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Máximo (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={marketPriceMax}
                            onChange={(e) => setMarketPriceMax(e.target.value)}
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      {(() => {
                        const min = parseFloat(marketPriceMin);
                        const avg = parseFloat(marketPriceAvg);
                        const max = parseFloat(marketPriceMax);
                        const price = parseFloat(sellingPrice) || suggestedPrice;
                        if (!avg || !price) return null;
                        const diff = ((price - avg) / avg) * 100;
                        const status = price < (min || avg * 0.9) ? "Abaixo do mercado" : price > (max || avg * 1.1) ? "Acima do mercado" : "Dentro da média";
                        const statusColor = status === "Abaixo do mercado" ? "text-primary" : status === "Acima do mercado" ? "text-destructive" : "text-success";
                        const bgColor = status === "Abaixo do mercado" ? "bg-primary/5 border-primary/20" : status === "Acima do mercado" ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20";
                        return (
                          <div className={`rounded-lg border p-3 ${bgColor}`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold text-sm ${statusColor}`}>{status}</span>
                              <span className={`font-mono text-sm ${statusColor}`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Seu preço: {formatCurrency(price)} | Média: {formatCurrency(avg)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

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
          ) : filteredRecipes.length === 0 && recipes.length > 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Nenhuma ficha encontrada</h3>
              <p className="text-muted-foreground mb-6">
                Nenhuma ficha técnica corresponde aos filtros selecionados.
              </p>
            </div>
          ) : filteredRecipes.length > 0 ? (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary">
                      <TableHead className="text-primary-foreground font-medium text-xs w-10 text-center">#</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs min-w-[150px]">Produto</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">Rend.</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-22 text-right">Custo Un.</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">CMV Des.</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-22 text-right">Preço Loja</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">CMV Loja</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-24 text-right">Lucro/Prod.</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-22 text-right">Preço iFood</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">CMV iFood</TableHead>
                      <TableHead className="text-primary-foreground font-medium text-xs w-24 text-right">Lucro/Prod.</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((recipe, index) => {
                      const costPerServing = recipe.cost_per_serving || 0;
                      const suggestedPrice = recipe.suggested_price || 0;
                      const cmvTarget = recipe.cmv_target || 30;
                      
                      // Use custom selling_price if exists, otherwise suggested_price
                      const lojaPrice = recipe.selling_price && recipe.selling_price > 0 
                        ? recipe.selling_price 
                        : suggestedPrice;
                      const isCustomLojaPrice = recipe.selling_price && recipe.selling_price > 0;
                      
                      // Use custom iFood price or calculate suggested
                      const suggestedIfoodPrice = ifoodRealPercentage && ifoodRealPercentage > 0 && lojaPrice > 0
                        ? lojaPrice / (1 - ifoodRealPercentage / 100)
                        : 0;
                      const ifoodPrice = recipe.ifood_selling_price && recipe.ifood_selling_price > 0 
                        ? recipe.ifood_selling_price 
                        : suggestedIfoodPrice;
                      const isCustomIfoodPrice = recipe.ifood_selling_price && recipe.ifood_selling_price > 0;
                      
                      // Loja metrics - now using lojaPrice
                      const cmvLoja = lojaPrice > 0 ? (costPerServing / lojaPrice) * 100 : 0;
                      const prodCostLoja = lojaPrice * (productionCostsPercent || 0) / 100;
                      const taxCostLoja = lojaPrice * (taxPercentage || 0) / 100;
                      const netProfitLoja = lojaPrice - costPerServing - prodCostLoja - taxCostLoja;
                      const netProfitPercentLoja = lojaPrice > 0 ? (netProfitLoja / lojaPrice) * 100 : 0;
                      const cmvLojaOk = cmvLoja <= cmvTarget;
                      
                      // iFood metrics
                      const ifoodFee = ifoodPrice * ((ifoodRealPercentage || 0) / 100);
                      const ifoodNetRevenue = ifoodPrice - ifoodFee;
                      const cmvIfood = ifoodNetRevenue > 0 ? (costPerServing / ifoodNetRevenue) * 100 : 0;
                      const prodCostIfood = ifoodNetRevenue * (productionCostsPercent || 0) / 100;
                      const taxCostIfood = ifoodNetRevenue * (taxPercentage || 0) / 100;
                      const netProfitIfood = ifoodNetRevenue - costPerServing - prodCostIfood - taxCostIfood;
                      const netProfitPercentIfood = ifoodPrice > 0 ? (netProfitIfood / ifoodPrice) * 100 : 0;
                      const cmvIfoodOk = cmvIfood <= cmvTarget;
                      
                      return (
                        <TableRow 
                          key={recipe.id}
                          className={index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"}
                        >
                          <TableCell className="text-center font-mono text-muted-foreground text-xs">{index + 1}</TableCell>
                          <TableCell className="font-medium text-foreground text-xs">{recipe.name}</TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground text-xs">{recipe.servings}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(costPerServing)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {cmvTarget.toFixed(0)}%
                          </TableCell>
                          {/* LOJA */}
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            {lojaPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={isCustomLojaPrice ? 'text-foreground' : 'text-muted-foreground'}>
                                  {formatCurrency(lojaPrice)}
                                </span>
                                {!isCustomLojaPrice && (
                                  <span className="text-[10px] text-muted-foreground/70">sugerido</span>
                                )}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {lojaPrice > 0 ? (
                              <span className={`font-mono font-semibold ${cmvLojaOk ? 'text-success' : 'text-warning'}`}>
                                {cmvLoja.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {lojaPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${netProfitLoja >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(netProfitLoja)}
                                </span>
                                <span className={`text-xs ${netProfitLoja >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {netProfitPercentLoja.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {/* IFOOD */}
                          <TableCell className="text-right">
                            {ifoodPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${isCustomIfoodPrice ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {formatCurrency(ifoodPrice)}
                                </span>
                                {!isCustomIfoodPrice && (
                                  <span className="text-[10px] text-muted-foreground/70">sugerido</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {ifoodPrice > 0 ? (
                              <span className={`font-mono font-semibold ${cmvIfoodOk ? 'text-success' : 'text-warning'}`}>
                                {cmvIfood.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {ifoodPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${netProfitIfood >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(netProfitIfood)}
                                </span>
                                <span className={`text-xs ${netProfitIfood >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {netProfitPercentIfood.toFixed(0)}%
                                </span>
                                {ifoodRealPercentage && ifoodRealPercentage > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    -{formatCurrency(ifoodFee)} taxa
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditRecipe(recipe)}
                                title="Editar ficha"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleDuplicateClick(recipe)}
                                title="Duplicar ficha"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                                onClick={() => handleDeleteClick(recipe)}
                                title="Excluir ficha"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
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

      {/* AlertDialog de confirmação de duplicação */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Duplicar ficha técnica
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Defina o nome para a nova ficha técnica:
                </p>
                <Input
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  placeholder="Nome da nova ficha"
                  className="text-foreground"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Todos os insumos e configurações serão copiados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDuplicating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicate}
              disabled={isDuplicating || !duplicateName.trim()}
            >
              {isDuplicating ? "Duplicando..." : "Duplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* iFood Import Modal */}
      <IfoodImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        importType="recipes"
        userId={user?.id || ""}
        userPlan={userPlan}
        onImportComplete={handleIfoodImport}
        onRefreshData={async () => {
          await fetchRecipes(user.id, activeStore?.id);
          await checkUsage();
        }}
      />

    </div>
  );
}
