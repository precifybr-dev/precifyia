import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Package, 
  Wine,
  Building2,
  Menu,
  TrendingUp,
  Calculator,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingProgress from "@/components/dashboard/OnboardingProgress";
import WelcomeImportPrompt from "@/components/dashboard/WelcomeImportPrompt";
import { QuickPriceUpdate } from "@/components/dashboard/QuickPriceUpdate";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { SpreadsheetImportModal } from "@/components/spreadsheet-import/SpreadsheetImportModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const TRIAL_DURATION_DAYS = 7;

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [existingIngredients, setExistingIngredients] = useState<{ name: string }[]>([]);
  
  // Real metrics state
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [averageCmv, setAverageCmv] = useState(0);
  const [averageMargin, setAverageMargin] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeStore, userPlan } = useStore();

  // Check if onboarding is complete
  const isOnboardingComplete = !!(
    profile?.business_name &&
    profile?.business_type &&
    ingredientsCount >= 3 &&
    recipesCount >= 3
  );

  // Calculate dynamic trial days remaining
  const trialDaysRemaining = (() => {
    if (userPlan === "pro" || userPlan === "basic") return null; // paid plan, no trial badge
    if (!profile?.created_at) return null;
    const createdAt = new Date(profile.created_at);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
    const remaining = differenceInDays(trialEnd, new Date());
    return Math.max(0, remaining);
  })();

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
      
      // Fetch existing ingredients for import modal (filtered by store)
      let ingListQuery = supabase.from("ingredients").select("name").eq("user_id", session.user.id);
      if (activeStore?.id) ingListQuery = ingListQuery.eq("store_id", activeStore.id);
      const { data: ingData } = await ingListQuery;
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

  // Re-fetch metrics and ingredients when store changes
  useEffect(() => {
    if (user?.id && profile) {
      fetchMetrics(user.id, profile);
      const refetchIngredients = async () => {
        let ingListQuery = supabase.from("ingredients").select("name").eq("user_id", user.id);
        if (activeStore?.id) ingListQuery = ingListQuery.eq("store_id", activeStore.id);
        const { data: ingData } = await ingListQuery;
        if (ingData) setExistingIngredients(ingData);
      };
      refetchIngredients();
    }
  }, [activeStore?.id]);

  const fetchMetrics = async (userId: string, profileData: any) => {
    const storeId = activeStore?.id;

    let ingQuery = supabase.from("ingredients").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (storeId) ingQuery = ingQuery.eq("store_id", storeId);
    const { count: ingCount } = await ingQuery;
    setIngredientsCount(ingCount || 0);

    let recQuery = supabase.from("recipes").select("total_cost, selling_price, suggested_price, cost_per_serving, cmv_target").eq("user_id", userId);
    if (storeId) recQuery = recQuery.eq("store_id", storeId);
    const { data: recipesData } = await recQuery;
    
    setRecipesCount(recipesData?.length || 0);

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

    if (storeId) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("monthly_revenue")
        .eq("id", storeId)
        .maybeSingle();
      setMonthlyRevenue(storeData?.monthly_revenue ? Number(storeData.monthly_revenue) : 0);
    } else {
      setMonthlyRevenue(profileData?.monthly_revenue || 0);
    }
  };

  const handleNavClick = (path: string) => {
    setSidebarOpen(false);
    
    const routes: Record<string, string> = {
      dashboard: "/app",
      business: "/app/business",
      ingredients: "/app/ingredients",
      beverages: "/app/beverages",
      recipes: "/app/recipes",
      combos: "/app/combos",
      menu: "/app/menu",
      backup: "/app/backup",
      support: "/app/support",
      universidade: "/app/universidade",
      "recycle-bin": "/app/recycle-bin",
    };
    
    if (routes[path]) {
      navigate(routes[path]);
    }
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
      {/* Sidebar — reuses shared AppSidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} profile={profile} />

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
              {trialDaysRemaining !== null && (
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-warning/10 text-warning-foreground border border-warning/20 text-xs sm:text-sm font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {trialDaysRemaining === 0
                      ? "Trial expirado"
                      : `Trial: ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? "s" : ""} restante${trialDaysRemaining !== 1 ? "s" : ""}`}
                  </span>
                  <span className="sm:hidden">{trialDaysRemaining}d</span>
                </div>
              )}
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
              <OnboardingProgress profile={profile} userId={user?.id} storeId={activeStore?.id} storeName={activeStore?.name} />
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

          {/* When onboarding is complete, show quick access + price update button */}
          {isOnboardingComplete && (
            <div className="space-y-4">
              <QuickPriceUpdate
                userId={user?.id}
                storeId={activeStore?.id || null}
                onPriceUpdated={() => fetchMetrics(user?.id, profile)}
              />

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
          let refetchQuery = supabase.from("ingredients").select("name").eq("user_id", user?.id);
          if (activeStore?.id) refetchQuery = refetchQuery.eq("store_id", activeStore.id);
          const { data } = await refetchQuery;
          if (data) setExistingIngredients(data);
        }}
      />
    </div>
  );
}
