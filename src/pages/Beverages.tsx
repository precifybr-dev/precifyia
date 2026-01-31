import { useState, useEffect, useRef } from "react";
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
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [beverageToDelete, setBeverageToDelete] = useState<Beverage | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const { activeStore } = useStore();

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
    const { data: maxCodeData } = await supabase
      .from("beverages")
      .select("code")
      .eq("user_id", user.id)
      .order("code", { ascending: false })
      .limit(1);
    
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
      color: null 
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
    
    const { error } = await supabase.from("beverages").delete().eq("id", beverageToDelete.id);
    
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Bebida excluída!" });
      await fetchBeverages(user.id, activeStore?.id);
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

  // Get iFood real percentage from profile
  const ifoodRealPercentage = profile?.ifood_real_percentage || 0;

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
    
    // Loja metrics
    const cmvLoja = sellingPrice > 0 ? (unitPrice / sellingPrice) * 100 : 0;
    const netProfitLoja = sellingPrice - unitPrice;
    const netProfitPercentLoja = sellingPrice > 0 ? (netProfitLoja / sellingPrice) * 100 : 0;
    
    // iFood metrics - deduct iFood fee from revenue
    const ifoodFee = ifoodPrice * (ifoodRealPercentage / 100);
    const ifoodNetRevenue = ifoodPrice - ifoodFee; // What we actually receive
    const cmvIfood = ifoodNetRevenue > 0 ? (unitPrice / ifoodNetRevenue) * 100 : 0;
    const netProfitIfood = ifoodNetRevenue - unitPrice;
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" showText />
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

          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>

            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary text-sm">{user?.email?.[0]?.toUpperCase()}</span>
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
                <h3 className="font-display font-semibold text-foreground">
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
                  <Label>Preço Venda Loja</Label>
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
                  <Label className="flex items-center gap-1">
                    Preço Venda iFood
                    {ifoodRealPercentage > 0 && (
                      <span className="text-xs text-muted-foreground">(taxa: {ifoodRealPercentage.toFixed(1)}%)</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.ifood_selling_price}
                      onChange={(e) => setFormData({ ...formData, ifood_selling_price: e.target.value })}
                      placeholder={
                        formData.selling_price && ifoodRealPercentage > 0
                          ? `Sugerido: ${formatCurrency(calculateSuggestedIfoodPrice(parseFloat(formData.selling_price) || 0))}`
                          : "R$ 0,00"
                      }
                      className={!formData.ifood_selling_price && formData.selling_price ? "text-muted-foreground/70" : ""}
                    />
                    {!formData.ifood_selling_price && formData.selling_price && ifoodRealPercentage > 0 && (
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <span className="text-muted-foreground/50 text-sm font-mono">
                          {formatCurrency(calculateSuggestedIfoodPrice(parseFloat(formData.selling_price) || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {ifoodRealPercentage > 0 && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 O lucro líquido do iFood já considera a taxa real de <strong>{ifoodRealPercentage.toFixed(1)}%</strong> configurada na Área do Negócio.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Cor:</Label>
                  <ColorPicker
                    value={formData.color}
                    onChange={(color) => setFormData({ ...formData, color })}
                  />
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
          ) : beverages.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary">
                      <TableHead className="text-primary-foreground font-semibold w-16">#</TableHead>
                      <TableHead className="text-primary-foreground font-semibold min-w-[180px]">PRODUTO</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-24 text-right">CUSTO UN</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-20 text-center">CMV DES</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-24 text-right">P. LOJA</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-20 text-center">CMV LOJA</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-28 text-right">LUCRO LOJA</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-24 text-right">P. IFOOD</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-20 text-center">CMV IFOOD</TableHead>
                      <TableHead className="text-primary-foreground font-semibold w-28 text-right">LUCRO IFOOD</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beverages.map((bev, index) => {
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
