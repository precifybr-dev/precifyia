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
  Check
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
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    tax_regime: "",
    default_profit_margin: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
        default_profit_margin: profileData.default_profit_margin?.toString() || "",
      });
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
        default_profit_margin: formData.default_profit_margin ? parseFloat(formData.default_profit_margin) : null,
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
        default_profit_margin: formData.default_profit_margin ? parseFloat(formData.default_profit_margin) : null,
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
      default_profit_margin: profile.default_profit_margin?.toString() || "",
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
                    Margem de Lucro Padrão
                  </Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.default_profit_margin}
                      onChange={(e) => setFormData({ ...formData, default_profit_margin: e.target.value })}
                      placeholder="30"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Será usada como padrão nas fichas técnicas</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Nome do Negócio</p>
                  <p className="font-semibold text-foreground">{profile?.business_name || "—"}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                  <p className="font-semibold text-foreground">{getBusinessTypeLabel(profile?.business_type)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Regime Tributário</p>
                  <p className="font-semibold text-foreground">{getTaxRegimeLabel(profile?.tax_regime)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Margem Padrão</p>
                  <p className="font-semibold text-foreground">
                    {profile?.default_profit_margin ? `${profile.default_profit_margin}%` : "—"}
                  </p>
                </div>
              </div>
            )}
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