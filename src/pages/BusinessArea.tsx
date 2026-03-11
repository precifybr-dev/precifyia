import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Building2, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Package,
  Wine,
  FileSpreadsheet,
  ChevronRight,
  Percent,
  Pencil,
  Save,
  X,
  TrendingUp,
  DollarSign,
  Wallet,
  BarChart3,
  Hash,
  Receipt,
  Calculator,
  Sun,
  Moon,
  AlertTriangle
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
import FixedCostsBlock from "@/components/business/FixedCostsBlock";
import VariableCostsBlock from "@/components/business/VariableCostsBlock";
import FixedExpensesBlock from "@/components/business/FixedExpensesBlock";
import VariableExpensesBlock from "@/components/business/VariableExpensesBlock";
import TotalBusinessCostBlock from "@/components/business/TotalBusinessCostBlock";
import TotalProductCostBlock from "@/components/business/TotalProductCostBlock";
import SimplifiedDREBlock from "@/components/business/SimplifiedDREBlock";
import MonthlyRevenueBlock from "@/components/business/MonthlyRevenueBlock";
import IfoodPlanBlock from "@/components/business/IfoodPlanBlock";
import TaxesAndFeesBlock from "@/components/business/TaxesAndFeesBlock";
import { useStore } from "@/contexts/StoreContext";
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useShell } from "@/components/layout/AppShell";
import { useBusinessMetrics } from "@/hooks/useBusinessMetrics";
interface BusinessMetrics {
  ingredientsCount: number;
  recipesCount: number;
  averageMargin: number | null;
  averageCMV: number | null;
  averagePrice: number | null;
}

const businessTypes = [
  { value: "restaurante", label: "Restaurante" },
  { value: "confeitaria", label: "Confeitaria" },
  { value: "padaria", label: "Padaria" },
  { value: "food_truck", label: "Food Truck" },
  { value: "delivery", label: "Delivery" },
  { value: "buffet", label: "Buffet" },
  { value: "outro", label: "Outro" },
];

const taxRegimes = [
  { value: "mei", label: "MEI" },
  { value: "simples", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
];

export default function BusinessArea() {
  const { activeStore, updateStore } = useStore();
  const { result: businessMetrics, isCalculating: isMetricsCalculating, error: metricsError, retryingIn, calculate: calculateMetrics } = useBusinessMetrics();
  const recalcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  
  // Single debounced recalc — all child callbacks funnel here
  // Ignores calls during initial load to prevent request storm
  const scheduleRecalc = useCallback(() => {
    if (!initialLoadDone.current) return;
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    recalcTimerRef.current = setTimeout(() => {
      calculateMetrics(activeStore?.id);
    }, 2000);
  }, [activeStore?.id, calculateMetrics]);

  // Memoized callbacks for child components — stable references prevent re-render loops
  const handleRevenueChange = useCallback((avg: number) => {
    setCalculatedMonthlyRevenue(avg);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleFixedCostsChange = useCallback((v: number) => {
    setFixedCostsTotal(v);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleVariableCostsChange = useCallback((v: number) => {
    setVariableCostsTotal(v);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleFixedExpensesChange = useCallback((v: number) => {
    setFixedExpensesTotal(v);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleSharedExpensesChange = useCallback((v: number) => {
    setSharedExpensesTotal(v);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleVariableExpensesChange = useCallback((v: number) => {
    setVariableExpensesTotal(v);
    scheduleRecalc();
  }, [scheduleRecalc]);

  const handleTaxesChanged = useCallback(() => {
    scheduleRecalc();
  }, [scheduleRecalc]);

  useEffect(() => {
    return () => { if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current); };
  }, []);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    ingredientsCount: 0,
    recipesCount: 0,
    averageMargin: null,
    averageCMV: null,
    averagePrice: null,
  });
  const [fixedCostsTotal, setFixedCostsTotal] = useState(0);
  const [variableCostsTotal, setVariableCostsTotal] = useState(0);
  const [fixedExpensesTotal, setFixedExpensesTotal] = useState(0);
  const [variableExpensesTotal, setVariableExpensesTotal] = useState(0);
  const [sharedExpensesTotal, setSharedExpensesTotal] = useState(0);
  const [cmvDialogOpen, setCmvDialogOpen] = useState(false);
  const [pendingCmvUpdate, setPendingCmvUpdate] = useState<{ oldCmv: number | null; newCmv: number } | null>(null);
  const [calculatedMonthlyRevenue, setCalculatedMonthlyRevenue] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    default_cmv: "",
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openSidebar } = useShell();

  const fetchMetrics = async (userId: string, storeId?: string | null) => {
    // Fetch ingredients count (filtered by store)
    let ingQuery = supabase
      .from("ingredients")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (storeId) ingQuery = ingQuery.eq("store_id", storeId);
    const { count: ingredientsCount } = await ingQuery;

    // Fetch recipes with cmv_target and cost data (filtered by store)
    let recQuery = supabase
      .from("recipes")
      .select("cmv_target, cost_per_serving, suggested_price", { count: "exact" })
      .eq("user_id", userId);
    if (storeId) recQuery = recQuery.eq("store_id", storeId);
    const { data: recipesData, count: recipesCount } = await recQuery;

    let averageMargin: number | null = null;
    let averageCMV: number | null = null;
    let averagePrice: number | null = null;

    if (recipesData && recipesData.length > 0) {
      // Calculate average CMV target (what user configured)
      const cmvTargets = recipesData.filter(r => r.cmv_target !== null).map(r => r.cmv_target as number);
      if (cmvTargets.length > 0) {
        averageCMV = cmvTargets.reduce((a, b) => a + b, 0) / cmvTargets.length;
      }

      // Calculate average realized margin (profit / price * 100)
      const margins = recipesData
        .filter(r => r.suggested_price > 0 && r.cost_per_serving > 0)
        .map(r => ((r.suggested_price - r.cost_per_serving) / r.suggested_price) * 100);
      if (margins.length > 0) {
        averageMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
      }

      // Calculate average selling price
      const prices = recipesData.filter(r => r.suggested_price > 0).map(r => r.suggested_price);
      if (prices.length > 0) {
        averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }

    setMetrics({
      ingredientsCount: ingredientsCount || 0,
      recipesCount: recipesCount || 0,
      averageMargin,
      averageCMV,
      averagePrice,
    });
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
      setFormData({
        business_name: activeStore?.name || profileData.business_name || "",
        business_type: activeStore?.business_type || profileData.business_type || "",
        default_cmv: (activeStore as any)?.default_cmv?.toString() || profileData.default_cmv?.toString() || "",
      });
      
      await fetchMetrics(session.user.id, activeStore?.id);
      setIsLoading(false);
      // Business metrics calculation is triggered by the activeStore effect below
    };
    checkAuth();
  }, [navigate]);

  // Recalculate when active store changes — single call, no cascade
  useEffect(() => {
    if (user) {
      initialLoadDone.current = false;
      // Reset local totals to prevent stale data flash
      setFixedCostsTotal(0);
      setVariableCostsTotal(0);
      setFixedExpensesTotal(0);
      setVariableExpensesTotal(0);
      setSharedExpensesTotal(0);
      setCalculatedMonthlyRevenue(null);
      // Update form data for new store
      setFormData({
        business_name: activeStore?.name || profile?.business_name || "",
        business_type: activeStore?.business_type || profile?.business_type || "",
        default_cmv: (activeStore as any)?.default_cmv?.toString() || profile?.default_cmv?.toString() || "",
      });
      // Fetch fresh data
      fetchMetrics(user.id, activeStore?.id);
      const timer = setTimeout(() => {
        initialLoadDone.current = true;
        calculateMetrics(activeStore?.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const saveBusinessData = async (propagateCmv: boolean = false) => {
    if (!activeStore || !user) return;
    setIsSaving(true);

    const newCmv = formData.default_cmv ? parseFloat(formData.default_cmv) : null;

    const storeUpdateData: any = {
      name: formData.business_name,
      business_type: formData.business_type,
      default_cmv: newCmv,
    };

    const success = await updateStore(activeStore.id, storeUpdateData);

    if (success && propagateCmv && newCmv !== null) {
      const [recipesResult, beveragesResult] = await Promise.all([
        supabase.from("recipes").update({ cmv_target: newCmv }).eq("user_id", user.id).eq("store_id", activeStore.id),
        supabase.from("beverages").update({ cmv_target: newCmv }).eq("user_id", user.id).eq("store_id", activeStore.id),
      ]);

      const hasError = recipesResult.error || beveragesResult.error;
      if (hasError) {
        toast({ title: "Aviso", description: "Configurações salvas, mas houve erro ao atualizar algumas fichas técnicas.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso!", description: "Configurações e todas as fichas técnicas atualizadas com o novo CMV." });
      }
    } else if (success) {
      toast({ title: "Sucesso!", description: "Configurações atualizadas." });
    }

    setIsEditing(false);
    setIsSaving(false);
    setPendingCmvUpdate(null);
  };

  const handleSave = async () => {
    if (!formData.business_name.trim()) {
      toast({ title: "Erro", description: "Nome do negócio é obrigatório", variant: "destructive" });
      return;
    }

    if (!activeStore) return;

    const newCmv = formData.default_cmv ? parseFloat(formData.default_cmv) : null;
    const oldCmv = activeStore.default_cmv;
    const cmvChanged = newCmv !== null && newCmv !== oldCmv;

    if (cmvChanged) {
      setPendingCmvUpdate({ oldCmv, newCmv });
      setCmvDialogOpen(true);
      return;
    }

    await saveBusinessData(false);
  };

  const handleCancel = () => {
    setFormData({
      business_name: activeStore?.name || "",
      business_type: activeStore?.business_type || "",
      default_cmv: activeStore?.default_cmv?.toString() || "",
    });
    setIsEditing(false);
  };

  // Sync form data when activeStore changes
  useEffect(() => {
    if (activeStore) {
      setFormData({
        business_name: activeStore.name || "",
        business_type: activeStore.business_type || "",
        default_cmv: activeStore.default_cmv?.toString() || "",
      });
      setIsEditing(false);
    }
  }, [activeStore?.id]);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business", active: true },
    { icon: Package, label: "Insumos", path: "/ingredients" },
    { icon: Wine, label: "Bebidas", path: "/beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "/recipes" },
  ];

  const getBusinessTypeLabel = (value: string) => {
    return businessTypes.find(t => t.value === value)?.label || value || "—";
  };

  const getTaxRegimeLabel = (value: string) => {
    return taxRegimes.find(t => t.value === value)?.label || value || "—";
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
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0" onClick={openSidebar}>
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="gap-1 px-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Área do Negócio</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Configure seu negócio</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:block"><StoreSwitcher /></div>
              {!isEditing && (
                <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">Configurações do Negócio</h3>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              )}
            </div>
            
            {isEditing ? (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome do Negócio *</Label>
                  <Input 
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Ex: Doces da Maria"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Negócio</Label>
                  <Select 
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    CMV Desejado (Padrão)
                  </Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="1"
                      max="99"
                      value={formData.default_cmv}
                      onChange={(e) => setFormData({ ...formData, default_cmv: e.target.value })}
                      placeholder="30"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentual do custo sobre o preço de venda</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Nome do Negócio</p>
                    <p className="font-semibold text-foreground text-lg">{activeStore?.name || "—"}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                    <p className="font-semibold text-foreground text-lg">{getBusinessTypeLabel(activeStore?.business_type || "")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">CMV Padrão</p>
                    <p className="font-semibold text-foreground text-lg">
                      {activeStore?.default_cmv ? `${activeStore.default_cmv}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Business Metrics Dashboard */}
          <div className="mt-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-foreground">Resumo do Negócio</h3>
                <p className="text-sm text-muted-foreground">Visão geral da saúde financeira</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Insumos cadastrados */}
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Insumos</span>
                </div>
                <p className="font-display text-3xl font-bold text-foreground">
                  {metrics.ingredientsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">cadastrados</p>
              </div>

              {/* Fichas técnicas */}
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Fichas Técnicas</span>
                </div>
                <p className="font-display text-3xl font-bold text-foreground">
                  {metrics.recipesCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">criadas</p>
              </div>

              {/* CMV Médio */}
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">CMV Médio</span>
                </div>
                <p className="font-display text-3xl font-bold text-foreground">
                  {metrics.averageCMV !== null ? `${metrics.averageCMV.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">custo sobre venda</p>
              </div>

              {/* Margem Média */}
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Margem Média</span>
                </div>
                <p className="font-display text-3xl font-bold text-success">
                  {metrics.averageMargin !== null ? `${metrics.averageMargin.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">lucro planejado</p>
              </div>
            </div>

            {metrics.recipesCount === 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Cadastre fichas técnicas para visualizar métricas de CMV e margem
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate("/app/recipes")}
                >
                  Criar primeira ficha
                </Button>
              </div>
            )}
          </div>

          {/* ========== SECTION: Monthly Revenue ========== */}
          <div className="mt-8">
            <MonthlyRevenueBlock 
              userId={user?.id}
              storeId={activeStore?.id}
              onAverageChange={handleRevenueChange}
            />
          </div>

          {/* ========== Retry / Error Banner ========== */}
          {(metricsError || retryingIn) && (
            <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${
              retryingIn 
                ? "bg-amber-500/10 border-amber-500/20" 
                : "bg-destructive/10 border-destructive/20"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                retryingIn ? "bg-amber-500/20" : "bg-destructive/20"
              }`}>
                {retryingIn ? (
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                {retryingIn ? (
                  <p className="text-sm text-foreground">
                    Servidor ocupado. Nova tentativa em <strong>{retryingIn}s</strong>...
                  </p>
                ) : (
                  <p className="text-sm text-destructive">{metricsError}</p>
                )}
              </div>
              {metricsError && !retryingIn && (
                <Button size="sm" variant="outline" onClick={() => calculateMetrics(activeStore?.id)}>
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          {/* ========== SECTION: Taxes and Fees ========== */}
          <div className="mt-8">
            <TaxesAndFeesBlock userId={user?.id} 
              taxPercentage={businessMetrics?.tax_percentage}
              averageCardFee={businessMetrics?.average_card_fee}
              totalDeductions={businessMetrics?.total_deductions}
              onDataChanged={handleTaxesChanged}
            />
          </div>

          {/* ========== SECTION: Production Costs (per item) ========== */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-foreground">Custos de Produção</h2>
                <p className="text-sm text-muted-foreground">Custos diretamente ligados à produção por item (embalagem, etiqueta, perdas)</p>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <FixedCostsBlock 
                userId={user?.id} 
                storeId={activeStore?.id}
                onTotalChange={handleFixedCostsChange}
              />
              <VariableCostsBlock 
                userId={user?.id} 
                storeId={activeStore?.id}
                onTotalChange={handleVariableCostsChange}
              />
            </div>
          </div>

          {/* ========== SECTION: Business Expenses (monthly) ========== */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-foreground">Despesas Mensais do Negócio</h2>
                <p className="text-sm text-muted-foreground">Gastos mensais do negócio (aluguel, luz, funcionários) — abatidos do faturamento total. Despesas do negócio são pagas com o lucro total do mês, não por produto individual.</p>
              </div>
            </div>

            {/* Total Business Expenses Block */}
            <TotalBusinessCostBlock
              fixedExpensesPercent={businessMetrics?.fixed_expenses_percent ?? null}
              variableExpensesPercent={businessMetrics?.variable_expenses_percent ?? null}
              totalExpensesPercent={businessMetrics?.total_expenses_percent ?? null}
              isOverLimit={businessMetrics?.is_over_limit ?? false}
              excessPercent={businessMetrics?.excess_percent ?? 0}
              costLimitPercent={businessMetrics?.cost_limit_percent ?? profile?.cost_limit_percent ?? 40}
              isCalculating={isMetricsCalculating}
              onLimitChange={async (newLimit) => {
                const { error } = await supabase
                  .from("profiles")
                  .update({ cost_limit_percent: newLimit })
                  .eq("user_id", user.id);
                
                if (!error) {
                  setProfile({ ...profile, cost_limit_percent: newLimit });
                  toast({ title: "Sucesso!", description: "Limite atualizado" });
                   scheduleRecalc();
                }
              }}
            />

            {/* Expenses Blocks */}
            <div className="mt-6 grid lg:grid-cols-2 gap-6">
              <FixedExpensesBlock 
                userId={user?.id} 
                storeId={activeStore?.id}
                monthlyRevenue={businessMetrics?.monthly_revenue ?? (profile?.monthly_revenue ? Number(profile.monthly_revenue) : null)}
                onTotalChange={handleFixedExpensesChange}
                onSharedTotalChange={handleSharedExpensesChange}
              />
              <VariableExpensesBlock 
                userId={user?.id} 
                storeId={activeStore?.id}
                monthlyRevenue={businessMetrics?.monthly_revenue ?? (profile?.monthly_revenue ? Number(profile.monthly_revenue) : null)}
                onTotalChange={handleVariableExpensesChange}
              />
            </div>
          </div>

          {/* ========== SECTION: Total Product Cost (consolidated) ========== */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-foreground">Custos de Produção (Rateio)</h2>
                <p className="text-sm text-muted-foreground">Percentual rateado sobre o faturamento, aplicado nas fichas técnicas</p>
              </div>
            </div>

            <TotalProductCostBlock
              productionCostsTotal={businessMetrics?.production_costs_total ?? 0}
              productionCostsPercent={businessMetrics?.production_costs_percent ?? null}
              remainingMargin={businessMetrics?.production_remaining_margin ?? null}
              monthlyRevenue={businessMetrics?.monthly_revenue ?? null}
              isCalculating={isMetricsCalculating}
            />
          </div>

          {/* ========== SECTION: Simplified DRE ========== */}
          <div className="mt-8">
            <SimplifiedDREBlock
              monthlyRevenue={businessMetrics?.monthly_revenue ?? null}
              fixedExpensesTotal={businessMetrics?.fixed_expenses_total ?? 0}
              variableExpensesTotal={businessMetrics?.variable_expenses_total ?? 0}
              totalExpenses={businessMetrics?.total_expenses ?? 0}
              netResult={businessMetrics?.net_result ?? null}
              netMarginPercent={businessMetrics?.net_margin_percent ?? null}
              isProfit={businessMetrics?.is_profit ?? false}
              fixedExpensesPercent={businessMetrics?.fixed_expenses_percent ?? null}
              variableExpensesPercent={businessMetrics?.variable_expenses_percent ?? null}
              profitHealthStatus={businessMetrics?.profit_health_status ?? null}
              isCalculating={isMetricsCalculating}
            />
          </div>

          {/* ========== SECTION: iFood Plan ========== */}
          <div className="mt-8">
            <IfoodPlanBlock userId={user?.id} />
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/app/ingredients")}
              className="p-4 bg-card rounded-xl border border-border shadow-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Insumos</span>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground">Gerencie ingredientes e matérias-primas</p>
            </button>

            <button
              onClick={() => navigate("/app/recipes")}
              className="p-4 bg-card rounded-xl border border-border shadow-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Fichas Técnicas</span>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground">Calcule custos e preços de venda</p>
            </button>

            <button
              onClick={() => navigate("/beverages")}
              className="p-4 bg-card rounded-xl border border-border shadow-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Wine className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Bebidas</span>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground">Gerencie o catálogo de bebidas</p>
            </button>
          </div>
        </div>
      </main>

      <AlertDialog open={cmvDialogOpen} onOpenChange={setCmvDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar fichas técnicas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você alterou o CMV de{" "}
              <strong>{pendingCmvUpdate?.oldCmv ?? "—"}%</strong> para{" "}
              <strong>{pendingCmvUpdate?.newCmv}%</strong>. Deseja atualizar
              todas as fichas técnicas e bebidas com o novo CMV?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCmvDialogOpen(false);
                saveBusinessData(false);
              }}
            >
              Não, manter como está
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCmvDialogOpen(false);
                saveBusinessData(true);
              }}
            >
              Sim, atualizar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}