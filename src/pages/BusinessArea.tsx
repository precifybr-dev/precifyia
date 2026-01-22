import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Hash
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
import FixedExpensesBlock from "@/components/business/FixedExpensesBlock";
import VariableExpensesBlock from "@/components/business/VariableExpensesBlock";

interface BusinessMetrics {
  ingredientsCount: number;
  recipesCount: number;
  averageMargin: number | null;
  averageCMV: number | null;
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
  });
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    tax_regime: "",
    default_cmv: "",
    monthly_revenue: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchMetrics = async (userId: string) => {
    // Fetch ingredients count
    const { count: ingredientsCount } = await supabase
      .from("ingredients")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Fetch recipes with cmv_target and cost data
    const { data: recipesData, count: recipesCount } = await supabase
      .from("recipes")
      .select("cmv_target, cost_per_serving, suggested_price", { count: "exact" })
      .eq("user_id", userId);

    let averageMargin: number | null = null;
    let averageCMV: number | null = null;

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
    }

    setMetrics({
      ingredientsCount: ingredientsCount || 0,
      recipesCount: recipesCount || 0,
      averageMargin,
      averageCMV,
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
        business_name: profileData.business_name || "",
        business_type: profileData.business_type || "",
        tax_regime: profileData.tax_regime || "",
        default_cmv: profileData.default_cmv?.toString() || "",
        monthly_revenue: profileData.monthly_revenue?.toString() || "",
      });
      
      await fetchMetrics(session.user.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const handleSave = async () => {
    if (!formData.business_name.trim()) {
      toast({ title: "Erro", description: "Nome do negócio é obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: formData.business_name,
        business_type: formData.business_type,
        tax_regime: formData.tax_regime,
        default_cmv: formData.default_cmv ? parseFloat(formData.default_cmv) : null,
        monthly_revenue: formData.monthly_revenue ? parseFloat(formData.monthly_revenue) : null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar as alterações", variant: "destructive" });
    } else {
      setProfile({
        ...profile,
        business_name: formData.business_name,
        business_type: formData.business_type,
        tax_regime: formData.tax_regime,
        default_cmv: formData.default_cmv ? parseFloat(formData.default_cmv) : null,
        monthly_revenue: formData.monthly_revenue ? parseFloat(formData.monthly_revenue) : null,
      });
      toast({ title: "Sucesso!", description: "Configurações atualizadas" });
      setIsEditing(false);
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      business_name: profile.business_name || "",
      business_type: profile.business_type || "",
      tax_regime: profile.tax_regime || "",
      default_cmv: profile.default_cmv?.toString() || "",
      monthly_revenue: profile.monthly_revenue?.toString() || "",
    });
    setIsEditing(false);
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
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
                <span className="font-semibold text-primary text-sm">
                  {user?.email?.[0]?.toUpperCase()}
                </span>
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
                <h1 className="font-display text-xl font-bold text-foreground">Área do Negócio</h1>
                <p className="text-sm text-muted-foreground">Configure as informações do seu negócio</p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
            )}
          </div>
        </header>

        <div className="p-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
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
                  <Label>Regime Tributário</Label>
                  <Select 
                    value={formData.tax_regime}
                    onValueChange={(value) => setFormData({ ...formData, tax_regime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRegimes.map((regime) => (
                        <SelectItem key={regime.value} value={regime.value}>
                          {regime.label}
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
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Faturamento Mensal Médio
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_revenue}
                      onChange={(e) => setFormData({ ...formData, monthly_revenue: e.target.value })}
                      placeholder="10000.00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base para cálculo de percentuais de custos fixos e variáveis (não interfere no preço de venda)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Faturamento em destaque */}
                <div className="p-5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {profile?.monthly_revenue 
                          ? `R$ ${Number(profile.monthly_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : "Não informado"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base global para cálculo de percentuais de custos fixos e variáveis
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Nome do Negócio</p>
                    <p className="font-semibold text-foreground text-lg">{profile?.business_name || "—"}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                    <p className="font-semibold text-foreground text-lg">{getBusinessTypeLabel(profile?.business_type)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Regime Tributário</p>
                    <p className="font-semibold text-foreground text-lg">{getTaxRegimeLabel(profile?.tax_regime)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">CMV Padrão</p>
                    <p className="font-semibold text-foreground text-lg">
                      {profile?.default_cmv ? `${profile.default_cmv}%` : "—"}
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
                  onClick={() => navigate("/recipes")}
                >
                  Criar primeira ficha
                </Button>
              </div>
            )}
          </div>

          {/* Expenses Blocks */}
          <div className="mt-6 grid lg:grid-cols-2 gap-6">
            <FixedExpensesBlock 
              userId={user?.id} 
              monthlyRevenue={profile?.monthly_revenue ? Number(profile.monthly_revenue) : null} 
            />
            <VariableExpensesBlock 
              userId={user?.id} 
              monthlyRevenue={profile?.monthly_revenue ? Number(profile.monthly_revenue) : null} 
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/ingredients")}
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
              onClick={() => navigate("/recipes")}
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
    </div>
  );
}