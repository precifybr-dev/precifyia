import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Wine, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Package,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
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
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useStore } from "@/contexts/StoreContext";
import { ColorPicker, ColorDot } from "@/components/ui/color-picker";
import { SearchAndFilter, BEVERAGE_CATEGORIES } from "@/components/ui/SearchAndFilter";
import { normalizeText } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useDataProtection } from "@/hooks/useDataProtection";

type Beverage = {
  id: string;
  code: number;
  name: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  unit_price: number | null;
  selling_price: number;
  ifood_selling_price: number;
  cmv_target: number | null;
  color: string | null;
  category: string | null;
};

const units = [
  { value: "un", label: "Unidade (un)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "dz", label: "Dúzia (dz)" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Beverages() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    unit: "un",
    purchase_quantity: "",
    purchase_price: "",
    selling_price: "",
    ifood_selling_price: "",
    cmv_target: "35",
    color: null as string | null,
    category: "" as string,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [beverageToDelete, setBeverageToDelete] = useState<Beverage | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { softDelete } = useDataProtection();
  const formRef = useRef<HTMLDivElement>(null);
  const { activeStore } = useStore();

  // Memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Filtered and sorted beverages (busca sem acentos)
  const filteredBeverages = useMemo(() => {
    let result = [...beverages];
    
    // Search by name (normalizada - ignora acentos)
    if (searchTerm) {
      const searchNormalized = normalizeText(searchTerm);
      result = result.filter(bev => 
        normalizeText(bev.name).includes(searchNormalized)
      );
    }
    
    // Filter by color
    if (selectedColor) {
      result = result.filter(bev => bev.color === selectedColor);
    }
    
    // Filter by category
    if (selectedCategory) {
      result = result.filter(bev => bev.category === selectedCategory);
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
      case "selling-asc":
        result.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
        break;
      case "selling-desc":
        result.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
        break;
      default:
        // Keep original order (by code)
        break;
    }
    
    return result;
  }, [beverages, searchTerm, selectedColor, selectedCategory, sortOption]);

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

  useEffect(() => {
    if (user?.id) {
      fetchBeverages(user.id, activeStore?.id);
    }
  }, [user?.id, activeStore?.id]);

  const fetchBeverages = async (userId: string, storeId?: string | null) => {
    let query = supabase
      .from("beverages")
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
      setBeverages(data);
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

  const getNextCode = async () => {
    let query = supabase
      .from("beverages")
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
    return maxCodeData && maxCodeData.length > 0 ? maxCodeData[0].code + 1 : 1;
  };

  const resetForm = () => {
    setFormData({ 
      code: "", 
      name: "", 
      unit: "un", 
      purchase_quantity: "", 
      purchase_price: "", 
      selling_price: "",
      ifood_selling_price: "",
      cmv_target: "35",
      color: null,
      category: ""
    });
    setShowForm(false);
    setEditingId(null);
  };

  const calculateUnitPrice = () => {
    const qty = parseFloat(formData.purchase_quantity) || 0;
    const price = parseFloat(formData.purchase_price) || 0;
    if (qty > 0 && price > 0) {
      return (price / qty).toFixed(2);
    }
    return "—";
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

    const existingCode = beverages.find(
      bev => bev.code === codeNum && bev.id !== editingId
    );
    if (existingCode) {
      toast({
        title: "Número já existe",
        description: `A bebida "${existingCode.name}" já usa o número ${codeNum}`,
        variant: "destructive",
      });
      return;
    }

    const beverageData = {
      user_id: user.id,
      store_id: activeStore?.id || null,
      code: codeNum,
      name: formData.name,
      unit: formData.unit,
      purchase_quantity: parseFloat(formData.purchase_quantity),
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price) || 0,
      ifood_selling_price: parseFloat(formData.ifood_selling_price) || 0,
      cmv_target: formData.cmv_target ? parseFloat(formData.cmv_target) : null,
      color: formData.color,
      category: formData.category || null,
    };

    if (editingId) {
      const { error } = await supabase.from("beverages").update(beverageData).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Bebida atualizada!" });
        await fetchBeverages(user.id, activeStore?.id);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("beverages").insert(beverageData);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Bebida adicionada!" });
        await fetchBeverages(user.id, activeStore?.id);
        resetForm();
      }
    }
  };

  const handleEdit = (beverage: Beverage) => {
    setFormData({
      code: beverage.code.toString(),
      name: beverage.name,
      unit: beverage.unit,
      purchase_quantity: beverage.purchase_quantity.toString(),
      purchase_price: beverage.purchase_price.toString(),
      selling_price: beverage.selling_price?.toString() || "",
      ifood_selling_price: beverage.ifood_selling_price?.toString() || "",
      cmv_target: beverage.cmv_target?.toString() || "35",
      color: beverage.color || null,
      category: beverage.category || "",
    });
    setEditingId(beverage.id);
    setShowForm(true);
    
    toast({
      title: "Modo edição",
      description: `Editando: ${beverage.name}`,
    });
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteClick = (beverage: Beverage) => {
    setBeverageToDelete(beverage);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!beverageToDelete) return;
    
    const { data: record } = await supabase.from("beverages").select("*").eq("id", beverageToDelete.id).single();
    if (record) {
      const success = await softDelete({ table: "beverages", id: beverageToDelete.id, data: record, storeId: activeStore?.id || null });
      if (success) {
        await fetchBeverages(user.id, activeStore?.id);
      }
    } else {
      toast({ title: "Erro", description: "Não foi possível encontrar a bebida", variant: "destructive" });
    }
    
    setDeleteDialogOpen(false);
    setBeverageToDelete(null);
  };

  const handleAddNew = async () => {
    const nextCode = await getNextCode();
    setFormData({
      ...formData,
      code: nextCode.toString(),
    });
    setShowForm(true);
    setEditingId(null);
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Business cost percentages for net profit calculation
  const [productionCostsPercent, setProductionCostsPercent] = useState<number | null>(null);
  const [totalBusinessCostPercent, setTotalBusinessCostPercent] = useState<number | null>(null);
  const [taxPercentage, setTaxPercentage] = useState<number | null>(null);

  // Get iFood real percentage from profile
  const ifoodRealPercentage = profile?.ifood_real_percentage || 0;

  // Fetch business costs for net profit deductions
  useEffect(() => {
    if (!user?.id || !profile) return;
    const monthlyRevenue = profile.monthly_revenue;

    const fetchCosts = async () => {
      const [{ data: fixedCostsData }, { data: variableCostsData }, { data: taxData }] = await Promise.all([
        supabase.from("fixed_costs").select("value_per_item").eq("user_id", user.id),
        supabase.from("variable_costs").select("value_per_item").eq("user_id", user.id),
        supabase.from("business_taxes").select("tax_percentage").eq("user_id", user.id).maybeSingle(),
      ]);

      const fixedTotal = fixedCostsData?.reduce((s, c) => s + Number(c.value_per_item), 0) || 0;
      const variableTotal = variableCostsData?.reduce((s, c) => s + Number(c.value_per_item), 0) || 0;
      const totalProd = fixedTotal + variableTotal;

      if (monthlyRevenue && monthlyRevenue > 0 && totalProd > 0) {
        setProductionCostsPercent((totalProd / monthlyRevenue) * 100);
      } else {
        setProductionCostsPercent(totalProd > 0 ? null : 0);
      }

      setTaxPercentage(taxData?.tax_percentage ? Number(taxData.tax_percentage) : null);

      if (!monthlyRevenue || monthlyRevenue <= 0) {
        setTotalBusinessCostPercent(null);
        return;
      }

      const [{ data: fixedExpData }, { data: varExpData }] = await Promise.all([
        supabase.from("fixed_expenses").select("monthly_value").eq("user_id", user.id),
        supabase.from("variable_expenses").select("monthly_value").eq("user_id", user.id),
      ]);

      const fixedExpTotal = fixedExpData?.reduce((s, e) => s + Number(e.monthly_value), 0) || 0;
      const varExpTotal = varExpData?.reduce((s, e) => s + Number(e.monthly_value), 0) || 0;
      setTotalBusinessCostPercent(((fixedExpTotal + varExpTotal) / monthlyRevenue) * 100);
    };

    fetchCosts();
  }, [user?.id, profile]);

  // Calculate suggested iFood price based on store price + iFood rate
  const calculateSuggestedIfoodPrice = (storePrice: number) => {
    if (storePrice <= 0 || ifoodRealPercentage <= 0) return 0;
    // Price that covers the iFood fee: storePrice / (1 - taxRate)
    return storePrice / (1 - ifoodRealPercentage / 100);
  };

  // Calculate CMV and Net Profit for a beverage (Loja and iFood)
  const calculateMetrics = (beverage: Beverage) => {
    const unitPrice = beverage.unit_price || (beverage.purchase_price / beverage.purchase_quantity);
    const sellingPrice = beverage.selling_price || 0;
    
    // Use custom iFood price or calculate suggested
    const suggestedIfoodPrice = calculateSuggestedIfoodPrice(sellingPrice);
    const ifoodPrice = beverage.ifood_selling_price > 0 ? beverage.ifood_selling_price : suggestedIfoodPrice;
    const cmvTarget = beverage.cmv_target || 35;
    
    // Loja metrics - deduct production costs, business expenses, and taxes as %
    const cmvLoja = sellingPrice > 0 ? (unitPrice / sellingPrice) * 100 : 0;
    const prodCostLoja = sellingPrice * (productionCostsPercent || 0) / 100;
    const taxCostLoja = sellingPrice * (taxPercentage || 0) / 100;
    const netProfitLoja = sellingPrice - unitPrice - prodCostLoja - taxCostLoja;
    const netProfitPercentLoja = sellingPrice > 0 ? (netProfitLoja / sellingPrice) * 100 : 0;
    
    // iFood metrics - deduct iFood fee, then production costs, business expenses, and taxes
    const ifoodFee = ifoodPrice * (ifoodRealPercentage / 100);
    const ifoodNetRevenue = ifoodPrice - ifoodFee;
    const cmvIfood = ifoodNetRevenue > 0 ? (unitPrice / ifoodNetRevenue) * 100 : 0;
    const prodCostIfood = ifoodNetRevenue * (productionCostsPercent || 0) / 100;
    const taxCostIfood = ifoodNetRevenue * (taxPercentage || 0) / 100;
    const netProfitIfood = ifoodNetRevenue - unitPrice - prodCostIfood - taxCostIfood;
    const netProfitPercentIfood = ifoodPrice > 0 ? (netProfitIfood / ifoodPrice) * 100 : 0;
    
    return { 
      unitPrice, 
      cmvTarget,
      cmvLoja, 
      netProfitLoja, 
      netProfitPercentLoja,
      cmvIfood,
      netProfitIfood,
      netProfitPercentIfood,
      ifoodPrice,
      suggestedIfoodPrice,
      ifoodFee,
      isCustomIfoodPrice: beverage.ifood_selling_price > 0
    };
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business" },
    { icon: Package, label: "Insumos", path: "/ingredients" },
    { icon: Wine, label: "Bebidas", path: "/beverages", active: true },
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
    <div className="min-h-screen bg-background flex">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} profile={profile} />

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Bebidas</h1>
                <p className="text-sm text-muted-foreground">Gerencie bebidas e drinks do cardápio</p>
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
                showSellingSort={true}
                showColorFilter={true}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                showCategoryFilter={true}
              />
              <StoreSwitcher />
              <Button className="gap-2" onClick={handleAddNew}>
                <Plus className="w-4 h-4" />
                Nova Bebida
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Form */}
          {showForm && (
            <div ref={formRef} className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-foreground">
                  {editingId ? "Editar Bebida" : "Nova Bebida"}
                </h3>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-2">
                  <Label>Número *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Coca-Cola 350ml"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Qtd Compra *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_quantity}
                    onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })}
                    placeholder="12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Custo Total *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>CMV Desejado %</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={formData.cmv_target}
                    onChange={(e) => setFormData({ ...formData, cmv_target: e.target.value })}
                    placeholder="35"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-muted-foreground">Preço de Venda Loja</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                    Preço de Venda iFood
                    {ifoodRealPercentage > 0 && (
                      <span className="text-xs opacity-60">(taxa {ifoodRealPercentage.toFixed(1)}%)</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ifood_selling_price || (formData.selling_price && ifoodRealPercentage > 0 
                      ? calculateSuggestedIfoodPrice(parseFloat(formData.selling_price) || 0).toFixed(2) 
                      : "")}
                    onChange={(e) => setFormData({ ...formData, ifood_selling_price: e.target.value })}
                    placeholder="R$ 0,00"
                    className={!formData.ifood_selling_price && formData.selling_price && ifoodRealPercentage > 0 ? "text-muted-foreground" : ""}
                  />
                  {!formData.ifood_selling_price && formData.selling_price && ifoodRealPercentage > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Sugerido com base no CMV desejado
                    </p>
                  )}
                </div>
              </div>

              {ifoodRealPercentage > 0 && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 O lucro líquido do iFood já considera a taxa real de <strong>{ifoodRealPercentage.toFixed(1)}%</strong> configurada na Área do Negócio.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Cor:</Label>
                  <ColorPicker
                    value={formData.color}
                    onChange={(color) => setFormData({ ...formData, color })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Categoria:</Label>
                  <Select 
                    value={formData.category || "none"} 
                    onValueChange={(val) => setFormData({ ...formData, category: val === "none" ? "" : val })}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {BEVERAGE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <div className="text-sm text-muted-foreground">
                    Custo Unit.: <span className="font-mono font-semibold text-primary">{calculateUnitPrice()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          {/* Table or Empty State */}
          {beverages.length === 0 && !showForm ? (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
              <Wine className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Nenhuma bebida cadastrada</h3>
              <p className="text-muted-foreground mb-6">
                Cadastre bebidas e drinks para precificá-los corretamente.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Bebida
              </Button>
            </div>
          ) : filteredBeverages.length === 0 && beverages.length > 0 && !showForm ? (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
              <Wine className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Nenhuma bebida encontrada</h3>
              <p className="text-muted-foreground mb-6">
                Nenhuma bebida corresponde aos filtros selecionados.
              </p>
            </div>
          ) : filteredBeverages.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary">
                      <TableHead className="text-primary-foreground font-medium w-16">#</TableHead>
                      <TableHead className="text-primary-foreground font-medium min-w-[180px]">Produto</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-24 text-right">Custo Un.</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-20 text-center">CMV Des.</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-24 text-right">Preço Loja</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-20 text-center">CMV Loja</TableHead>
                       <TableHead className="text-primary-foreground font-medium w-28 text-right">Lucro/Produto</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-24 text-right">Preço iFood</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-20 text-center">CMV iFood</TableHead>
                      <TableHead className="text-primary-foreground font-medium w-28 text-right">Lucro/Produto</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBeverages.map((bev, index) => {
                      const metrics = calculateMetrics(bev);
                      const cmvLojaOk = metrics.cmvLoja <= metrics.cmvTarget;
                      const cmvIfoodOk = metrics.cmvIfood <= metrics.cmvTarget;
                      
                      return (
                        <TableRow 
                          key={bev.id}
                          className={index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"}
                        >
                          <TableCell className="font-mono">
                            <div className="flex items-center gap-1.5">
                              <ColorDot color={bev.color} size="sm" />
                              <span className="font-semibold">{bev.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{bev.name}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(metrics.unitPrice)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {metrics.cmvTarget.toFixed(0)}%
                          </TableCell>
                          {/* LOJA */}
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            {bev.selling_price > 0 ? formatCurrency(bev.selling_price) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {bev.selling_price > 0 ? (
                              <span className={`font-mono font-semibold ${cmvLojaOk ? 'text-success' : 'text-warning'}`}>
                                {metrics.cmvLoja.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {bev.selling_price > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${metrics.netProfitLoja >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(metrics.netProfitLoja)}
                                </span>
                                <span className={`text-xs ${metrics.netProfitLoja >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {metrics.netProfitPercentLoja.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {/* IFOOD */}
                          <TableCell className="text-right">
                            {metrics.ifoodPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${metrics.isCustomIfoodPrice ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {formatCurrency(metrics.ifoodPrice)}
                                </span>
                                {!metrics.isCustomIfoodPrice && (
                                  <span className="text-[10px] text-muted-foreground/70">sugerido</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {metrics.ifoodPrice > 0 ? (
                              <span className={`font-mono font-semibold ${cmvIfoodOk ? 'text-success' : 'text-warning'}`}>
                                {metrics.cmvIfood.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {metrics.ifoodPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className={`font-mono font-semibold ${metrics.netProfitIfood >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {formatCurrency(metrics.netProfitIfood)}
                                </span>
                                <span className={`text-xs ${metrics.netProfitIfood >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {metrics.netProfitPercentIfood.toFixed(0)}%
                                </span>
                                {ifoodRealPercentage > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    -{formatCurrency(metrics.ifoodFee)} taxa
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(bev)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteClick(bev)}
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </div>
      </main>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bebida?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{beverageToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
