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
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          navigate("/login");
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/login");
      }
      setIsLoading(false);
    });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Building2, label: "Área do Negócio", active: false },
    { icon: Package, label: "Insumos", active: false },
    { icon: Wine, label: "Bebidas", active: false },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", active: false },
  ];

  const stats = [
    {
      icon: DollarSign,
      label: "Faturamento Mensal",
      value: "R$ 0,00",
      change: "Configure seu negócio",
      changeType: "neutral" as const,
    },
    {
      icon: Calculator,
      label: "CMV Médio",
      value: "0%",
      change: "Adicione fichas técnicas",
      changeType: "neutral" as const,
    },
    {
      icon: TrendingUp,
      label: "Margem Líquida",
      value: "0%",
      change: "Complete o cadastro",
      changeType: "neutral" as const,
    },
    {
      icon: FileSpreadsheet,
      label: "Fichas Técnicas",
      value: "0",
      change: "Limite: 3 (trial)",
      changeType: "neutral" as const,
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">P</span>
              </div>
              <span className="font-display font-bold text-xl">PRECIFY</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
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
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
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
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Visão geral do seu negócio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Trial: 7 dias restantes
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Welcome Card */}
          <div className="bg-gradient-primary rounded-2xl p-6 md:p-8 mb-8 text-primary-foreground">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Bem-vindo ao PRECIFY! 👋
            </h2>
            <p className="opacity-90 mb-4 max-w-xl">
              Complete o cadastro do seu negócio para começar a precificar seus produtos 
              com precisão. Siga o passo a passo abaixo.
            </p>
            <Button variant="glass" size="lg">
              Começar Onboarding
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-5 border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="font-display text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Próximos Passos</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <Building2 className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1">Configurar Negócio</h4>
                <p className="text-sm text-muted-foreground">
                  Cadastre custos, despesas e impostos
                </p>
              </button>
              <button className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <Package className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1">Adicionar Insumos</h4>
                <p className="text-sm text-muted-foreground">
                  Cadastre os ingredientes das receitas
                </p>
              </button>
              <button className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <FileSpreadsheet className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1">Criar Ficha Técnica</h4>
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
