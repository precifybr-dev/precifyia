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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingProgress from "@/components/dashboard/OnboardingProgress";
import { Logo } from "@/components/ui/Logo";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      setUser(session.user);

      // Check onboarding status
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
      dashboard: "/dashboard",
      business: "/business",
      ingredients: "/ingredients",
      beverages: "/beverages",
      recipes: "/recipes",
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
        navigate("/business");
        break;
      case "ingredients":
        navigate("/ingredients");
        break;
      case "recipe":
        navigate("/recipes");
        break;
      default:
        toast({
          title: "Ação",
          description: "Funcionalidade em desenvolvimento.",
        });
    }
  };

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
  ];

  const stats = [
    {
      icon: DollarSign,
      label: "Faturamento Mensal",
      value: "R$ 0,00",
      change: "Configure seu negócio",
      color: "primary" as const,
    },
    {
      icon: Calculator,
      label: "CMV Médio",
      value: "0%",
      change: "Adicione fichas técnicas",
      color: "primary" as const,
    },
    {
      icon: TrendingUp,
      label: "Margem Líquida",
      value: "0%",
      change: "Complete o cadastro",
      color: "success" as const,
    },
    {
      icon: FileSpreadsheet,
      label: "Fichas Técnicas",
      value: "0",
      change: "Limite: 3 (trial)",
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
          <div className="p-6 border-b border-border">
            <button 
              onClick={() => navigate("/")}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo size="sm" showText />
            </button>
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

          {/* User & Logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary text-sm">
                  {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {profile?.business_name || user?.user_metadata?.full_name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
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

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 hover:bg-muted rounded-lg"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Visão geral do seu negócio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning-foreground border border-warning/20 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Trial: 7 dias restantes
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Welcome Card */}
          <div className="bg-primary rounded-2xl p-6 md:p-8 mb-8 text-primary-foreground">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
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

          {/* Onboarding Progress */}
          <div className="mb-8">
            <OnboardingProgress profile={profile} userId={user?.id} />
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-5 border border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => handleNavClick(stat.label === "Fichas Técnicas" ? "recipes" : "dashboard")}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.color === 'success' ? 'bg-success/10' : 'bg-primary/10'} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color === 'success' ? 'text-success' : 'text-primary'}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="font-display text-2xl font-bold mb-1 text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h3 className="font-display font-semibold text-lg mb-4 text-foreground">Próximos Passos</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      </main>
    </div>
  );
}
