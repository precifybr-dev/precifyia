import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Package, 
  Wine,
  Building2,
  LogOut,
  Menu,
  TrendingUp,
  Calculator,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Plus,
  Store,
  Crown,
  Sun,
  Moon,
  Sparkles,
  Headphones,
  HardDrive,
  Trash2,
  User,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreateStoreModal } from "@/components/store/CreateStoreModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingProgress from "@/components/dashboard/OnboardingProgress";
import WelcomeImportPrompt from "@/components/dashboard/WelcomeImportPrompt";
import { Logo } from "@/components/ui/Logo";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { SpreadsheetImportModal } from "@/components/spreadsheet-import/SpreadsheetImportModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  active?: boolean;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [existingIngredients, setExistingIngredients] = useState<{ name: string }[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  
  // Real metrics state
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [averageCmv, setAverageCmv] = useState(0);
  const [averageMargin, setAverageMargin] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeStore, userPlan, canCreateStore, storeCount, maxStores } = useStore();
  
  const isPro = userPlan === "pro";

  // Check if onboarding is complete (business configured + ≥3 ingredients + ≥3 recipes)
  const isOnboardingComplete = !!(
    profile?.business_name &&
    profile?.business_type &&
    ingredientsCount >= 3 &&
    recipesCount >= 3
  );

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
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
      
      // Fetch existing ingredients for import modal
      const { data: ingData } = await supabase
        .from("ingredients")
        .select("name")
        .eq("user_id", session.user.id);
      if (ingData) setExistingIngredients(ingData);
      
      // Fetch real metrics
      await fetchMetrics(session.user.id, profileData);
      
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          navigate("/login");
          return;
        }
        
        if (event === "SIGNED_IN") {
          checkAuthAndOnboarding();
        }
      }
    );

    checkAuthAndOnboarding();

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Re-fetch metrics when store changes
  useEffect(() => {
    if (user?.id && profile) {
      fetchMetrics(user.id, profile);
    }
  }, [activeStore?.id]);

  const fetchMetrics = async (userId: string, profileData: any) => {
    const storeId = activeStore?.id;

    // Count ingredients
    let ingQuery = supabase.from("ingredients").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (storeId) ingQuery = ingQuery.eq("store_id", storeId);
    const { count: ingCount } = await ingQuery;
    setIngredientsCount(ingCount || 0);

    // Count and fetch recipes with pricing data
    let recQuery = supabase.from("recipes").select("total_cost, selling_price, suggested_price, cost_per_serving, cmv_target").eq("user_id", userId);
    if (storeId) recQuery = recQuery.eq("store_id", storeId);
    const { data: recipesData } = await recQuery;
    
    setRecipesCount(recipesData?.length || 0);

    // Calculate average CMV and margin from real recipes
    if (recipesData && recipesData.length > 0) {
      let totalCmv = 0;
      let totalMargin = 0;
      let countWithPrice = 0;

      recipesData.forEach((r) => {
        const price = r.selling_price || r.suggested_price || 0;
        if (price > 0 && r.total_cost > 0) {
          const cmv = (r.total_cost / price) * 100;
          const margin = ((price - r.total_cost) / price) * 100;
          totalCmv += cmv;
          totalMargin += margin;
          countWithPrice++;
        }
      });

      if (countWithPrice > 0) {
        setAverageCmv(totalCmv / countWithPrice);
        setAverageMargin(totalMargin / countWithPrice);
      }
    }

    // Monthly revenue from profile
    setMonthlyRevenue(profileData?.monthly_revenue || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  const handleNavClick = (path: string) => {
    setActiveNav(path);
    setSidebarOpen(false);
    
    const routes: Record<string, string> = {
      dashboard: "/app",
      business: "/app/business",
      ingredients: "/app/ingredients",
      beverages: "/app/beverages",
      recipes: "/app/recipes",
      combos: "/app/combos",
      backup: "/app/backup",
      support: "/app/support",
      "recycle-bin": "/app/recycle-bin",
    };
    
    if (routes[path]) {
      navigate(routes[path]);
    }
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

  const handleStartOnboarding = () => {
    toast({
      title: "Iniciando onboarding...",
      description: "Redirecionando para configuração do negócio.",
    });
    navigate("/onboarding");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "business":
        navigate("/app/business");
        break;
      case "ingredients":
        navigate("/app/ingredients");
        break;
      case "recipe":
        navigate("/app/recipes");
        break;
      default:
        toast({
          title: "Ação",
          description: "Funcionalidade em desenvolvimento.",
        });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "business" },
    { icon: Package, label: "Insumos", path: "ingredients" },
    { icon: Wine, label: "Bebidas", path: "beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "recipes" },
    { icon: Sparkles, label: "Combos (BETA)", path: "combos" },
    { icon: Headphones, label: "Suporte", path: "support" },
  ];

  const stats = [
    {
      icon: DollarSign,
      label: "Faturamento Mensal",
      value: monthlyRevenue > 0 ? formatCurrency(monthlyRevenue) : "R$ 0,00",
      change: monthlyRevenue > 0 ? "Configurado" : "Configure seu negócio",
      color: "primary" as const,
    },
    {
      icon: Calculator,
      label: "CMV Médio",
      value: averageCmv > 0 ? `${averageCmv.toFixed(1)}%` : "0%",
      change: recipesCount > 0 ? `${recipesCount} fichas técnicas` : "Adicione fichas técnicas",
      color: "primary" as const,
    },
    {
      icon: TrendingUp,
      label: "Margem Líquida",
      value: averageMargin > 0 ? `${averageMargin.toFixed(1)}%` : "0%",
      change: averageMargin > 0 ? "Média das receitas" : "Complete o cadastro",
      color: "success" as const,
    },
    {
      icon: FileSpreadsheet,
      label: "Fichas Técnicas",
      value: recipesCount.toString(),
      change: `${ingredientsCount} insumos cadastrados`,
      color: "primary" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <button 
              onClick={() => navigate("/")}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo size="sm" showText />
            </button>
          </div>

          {/* Active Store Section */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeStore?.logo_url ? (
                  <img 
                    src={activeStore.logo_url} 
                    alt={activeStore.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">
                  {activeStore?.name || "Minha Loja"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeStore?.business_type 
                    ? activeStore.business_type.charAt(0).toUpperCase() + activeStore.business_type.slice(1).replace(/_/g, ' ')
                    : "Negócio"}
                </p>
              </div>
            </div>

            {isPro ? (
              <button
                onClick={() => setShowCreateStoreModal(true)}
                disabled={!canCreateStore}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canCreateStore
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Nova Loja</span>
                {!canCreateStore && (
                  <span className="ml-auto text-xs">({storeCount}/{maxStores})</span>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  toast({
                    title: "Recurso exclusivo PRO",
                    description: "Múltiplas lojas estão disponíveis apenas no Plano Pro.",
                    action: (
                      <button
                        onClick={() => navigate("/pricing")}
                        className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium hover:bg-primary/90"
                      >
                        Fazer upgrade
                      </button>
                    ),
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Loja</span>
                <Crown className="w-3.5 h-3.5 ml-auto text-warning" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === item.path
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {activeNav !== item.path && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                )}
              </button>
            ))}
          </nav>

          {/* Footer: Theme + User Menu */}
          <div className="p-4 border-t border-border space-y-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>

            <Separator />

            {/* User Menu - Clickable with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-primary text-sm">
                      {profile?.business_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {profile?.business_name || user?.user_metadata?.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="start" 
                className="w-56 p-2"
                sideOffset={8}
              >
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavClick("recycle-bin")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <span className="block font-medium">Lixeira</span>
                      <span className="block text-xs text-muted-foreground">Itens mantidos por 30 dias</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick("backup")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Backup dos meus dados</span>
                  </button>
                  <Separator className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sair</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Create Store Modal */}
      <CreateStoreModal 
        open={showCreateStoreModal} 
        onOpenChange={setShowCreateStoreModal}
        onStoreCreated={(storeId) => {
          navigate(`/store-onboarding/${storeId}`);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Visão geral do seu negócio
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:block"><StoreSwitcher /></div>
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-warning/10 text-warning-foreground border border-warning/20 text-xs sm:text-sm font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                <span className="hidden sm:inline">Trial: 7 dias restantes</span>
                <span className="sm:hidden">7d</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Welcome Card - only show when onboarding is NOT complete */}
          {!isOnboardingComplete && (
            <div className="bg-primary rounded-2xl p-5 sm:p-6 md:p-8 mb-6 text-primary-foreground">
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                Bem-vindo ao PRECIFY! 👋
              </h2>
              <p className="opacity-90 mb-4 max-w-xl leading-relaxed">
                Complete o cadastro do seu negócio para começar a precificar seus produtos 
                com precisão. Siga o passo a passo abaixo.
              </p>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={handleStartOnboarding}
                className="group active:scale-95 transition-all"
              >
                Começar Onboarding
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {/* Welcome Import Prompt - only when not complete */}
          {!isOnboardingComplete && (
            <div className="mb-6">
              <WelcomeImportPrompt
                userId={user?.id}
                storeId={activeStore?.id || null}
                onOpenSpreadsheetImport={() => setImportModalOpen(true)}
              />
            </div>
          )}

          {/* Onboarding Progress - only when not complete */}
          {!isOnboardingComplete && (
            <div className="mb-6">
              <OnboardingProgress profile={profile} userId={user?.id} />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-3 sm:p-5 border border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer active:scale-[0.98]"
                onClick={() => handleNavClick(stat.label === "Fichas Técnicas" ? "recipes" : "dashboard")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color === 'success' ? 'bg-success/10' : 'bg-primary/10'} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color === 'success' ? 'text-success' : 'text-primary'}`} />
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{stat.label}</span>
                </div>
                <p className="font-display text-lg sm:text-2xl font-bold mb-0.5 text-foreground">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions - only show when onboarding is NOT complete */}
          {!isOnboardingComplete && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg mb-4 text-foreground">Próximos Passos</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <button 
                  onClick={() => handleQuickAction("business")}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <Building2 className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-1 text-foreground">Configurar Negócio</h4>
                  <p className="text-sm text-muted-foreground">
                    Cadastre custos, despesas e impostos
                  </p>
                </button>
                <button 
                  onClick={() => handleQuickAction("ingredients")}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <Package className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-1 text-foreground">Adicionar Insumos</h4>
                  <p className="text-sm text-muted-foreground">
                    Cadastre os ingredientes das receitas
                  </p>
                </button>
                <button 
                  onClick={() => handleQuickAction("recipe")}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <FileSpreadsheet className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-1 text-foreground">Criar Ficha Técnica</h4>
                  <p className="text-sm text-muted-foreground">
                    Monte a receita de um produto
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* When onboarding is complete, show quick access cards */}
          {isOnboardingComplete && (
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-card">
              <h3 className="font-display font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-foreground">Acesso Rápido</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleNavClick("business")}
                  className="p-3 sm:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
                >
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Área do Negócio</h4>
                </button>
                <button 
                  onClick={() => handleNavClick("ingredients")}
                  className="p-3 sm:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
                >
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Insumos ({ingredientsCount})</h4>
                </button>
                <button 
                  onClick={() => handleNavClick("recipes")}
                  className="p-3 sm:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Fichas ({recipesCount})</h4>
                </button>
                <button 
                  onClick={() => handleNavClick("beverages")}
                  className="p-3 sm:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
                >
                  <Wine className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1.5 sm:mb-2" />
                  <h4 className="font-semibold text-xs sm:text-sm text-foreground">Bebidas</h4>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        userId={user?.id || ""}
        storeId={activeStore?.id || null}
        existingIngredients={existingIngredients}
        onImportComplete={async () => {
          const { data } = await supabase.from("ingredients").select("name").eq("user_id", user?.id);
          if (data) setExistingIngredients(data);
        }}
      />
    </div>
  );
}
