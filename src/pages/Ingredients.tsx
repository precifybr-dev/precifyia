import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Wine,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  HelpCircle,
  Calculator,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { formatIngredientCode } from "@/lib/ingredient-utils";
import { ColorPicker, ColorDot } from "@/components/ui/color-picker";

type Ingredient = {
  id: string;
  code: number;
  name: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  unit_price: number | null;
  correction_factor: number | null;
  color: string | null;
};

const units = [
  { value: "un", label: "Unidade (un)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "dz", label: "Dúzia (dz)" },
];

export default function Ingredients() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    unit: "un",
    purchase_quantity: "",
    purchase_price: "",
    correction_factor: "1",
    color: null as string | null,
  });
  const [fcCalculator, setFcCalculator] = useState({
    grossQuantity: "",
    netQuantity: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  // Calcula o F.C automaticamente quando os valores mudam
  const calculateFC = () => {
    const gross = parseFloat(fcCalculator.grossQuantity);
    const net = parseFloat(fcCalculator.netQuantity);
    if (gross > 0 && net > 0 && net <= gross) {
      const fc = (gross / net).toFixed(2);
      setFormData({ ...formData, correction_factor: fc });
      toast({
        title: "F.C calculado!",
        description: `Fator de Correção: ${fc}`,
      });
    } else if (net > gross) {
      toast({
        title: "Valores inválidos",
        description: "A quantidade líquida não pode ser maior que a bruta",
        variant: "destructive",
      });
    }
  };

  // Calcula o custo unitário com F.C em tempo real
  const calculateUnitPrice = () => {
    const qty = parseFloat(formData.purchase_quantity) || 0;
    const price = parseFloat(formData.purchase_price) || 0;
    const fc = parseFloat(formData.correction_factor) || 1;
    if (qty > 0 && price > 0) {
      return ((price / qty) * fc).toFixed(2);
    }
    return "—";
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
      await fetchIngredients(session.user.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchIngredients = async (userId: string) => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true });

    if (!error && data) {
      setIngredients(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const getNextCode = () => {
    if (ingredients.length === 0) return 1;
    const maxCode = Math.max(...ingredients.map(ing => ing.code));
    return maxCode + 1;
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", unit: "un", purchase_quantity: "", purchase_price: "", correction_factor: "1", color: null });
    setFcCalculator({ grossQuantity: "", netQuantity: "" });
    setShowForm(false);
    setEditingId(null);
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

    // Verificar duplicidade de código
    const existingCode = ingredients.find(
      ing => ing.code === codeNum && ing.id !== editingId
    );
    if (existingCode) {
      toast({
        title: "Número já existe",
        description: `O insumo "${existingCode.name}" já usa o número ${codeNum}`,
        variant: "destructive",
      });
      return;
    }

    const ingredientData = {
      user_id: user.id,
      code: codeNum,
      name: formData.name,
      unit: formData.unit,
      purchase_quantity: parseFloat(formData.purchase_quantity),
      purchase_price: parseFloat(formData.purchase_price),
      correction_factor: formData.correction_factor ? parseFloat(formData.correction_factor) : null,
      color: formData.color,
    };

    if (editingId) {
      const { error } = await supabase.from("ingredients").update(ingredientData).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Insumo atualizado!" });
        await fetchIngredients(user.id);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("ingredients").insert(ingredientData);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Insumo adicionado!" });
        await fetchIngredients(user.id);
        resetForm();
      }
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      code: ingredient.code.toString(),
      name: ingredient.name,
      unit: ingredient.unit,
      purchase_quantity: ingredient.purchase_quantity.toString(),
      purchase_price: ingredient.purchase_price.toString(),
      correction_factor: ingredient.correction_factor?.toString() || "1",
      color: ingredient.color || null,
    });
    setFcCalculator({ grossQuantity: "", netQuantity: "" });
    setEditingId(ingredient.id);
    setShowForm(true);
    
    toast({
      title: "Modo edição",
      description: `Editando: ${ingredient.name}`,
    });
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteClick = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ingredientToDelete) return;
    
    const { error } = await supabase.from("ingredients").delete().eq("id", ingredientToDelete.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Insumo removido!" });
      await fetchIngredients(user.id);
    }
    
    setDeleteDialogOpen(false);
    setIngredientToDelete(null);
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business" },
    { icon: Package, label: "Insumos", path: "/ingredients", active: true },
    { icon: Wine, label: "Bebidas", path: "/beverages" },
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Insumos</h1>
                <p className="text-sm text-muted-foreground">Gerencie os ingredientes das suas receitas</p>
              </div>
            </div>
            <Button onClick={() => {
              setFormData({ ...formData, code: getNextCode().toString() });
              setShowForm(true);
            }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Insumo
            </Button>
          </div>
        </header>

        <div className="p-6">
          {showForm && (
            <div ref={formRef} className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{editingId ? "Editar Insumo" : "Novo Insumo"}</h3>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                  <Label>Nº *</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={formData.code} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, code: value });
                    }}
                    placeholder="1" 
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Farinha de Trigo" />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input type="number" step="0.01" value={formData.purchase_quantity} onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })} placeholder="1.00" />
                </div>
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="10.00" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Label className="mb-0">F.C</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-4">
                          <p className="font-semibold mb-2">Fator de Correção (F.C)</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Usado para ajustar perdas no preparo dos alimentos.
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Exemplo:</strong> Você compra 1 kg bruto de um alimento, mas após limpeza sobram 800 g.
                          </p>
                          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            F.C = 1 ÷ 0,8 = 1,25
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Esse fator garante que o custo unitário reflita o custo real do produto.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-primary transition-colors ml-1" title="Calculadora de F.C">
                          <Calculator className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">Calculadora de F.C</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Quantidade Bruta</Label>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ex: 1000" 
                                value={fcCalculator.grossQuantity}
                                onChange={(e) => setFcCalculator({ ...fcCalculator, grossQuantity: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantidade Líquida</Label>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ex: 800" 
                                value={fcCalculator.netQuantity}
                                onChange={(e) => setFcCalculator({ ...fcCalculator, netQuantity: e.target.value })}
                              />
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            size="sm" 
                            className="w-full" 
                            onClick={calculateFC}
                            disabled={!fcCalculator.grossQuantity || !fcCalculator.netQuantity}
                          >
                            Calcular F.C
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            F.C = Bruto ÷ Líquido
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="1"
                    value={formData.correction_factor} 
                    onChange={(e) => setFormData({ ...formData, correction_factor: e.target.value })} 
                    placeholder="1.00" 
                  />
                </div>
              </div>
              
              {/* Seletor de cor */}
              <div className="mt-4">
                <Label className="mb-2 block">Cor (opcional)</Label>
                <ColorPicker 
                  value={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use cores para categorizar seus insumos (ex: verde para vegetais, vermelho para carnes)
                </p>
              </div>
              
              {/* Preview do custo unitário calculado */}
              {formData.purchase_quantity && formData.purchase_price && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Custo unitário calculado:</span>
                    <span className="font-semibold text-primary text-lg">R$ {calculateUnitPrice()}/{formData.unit}</span>
                  </div>
                  {parseFloat(formData.correction_factor) > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Inclui F.C de {formData.correction_factor} (ajuste de perdas)
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cód.</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">F.C</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum insumo cadastrado. Clique em "Novo Insumo" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((ing) => (
                    <TableRow key={ing.id} className={editingId === ing.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}>
                      <TableCell className="font-mono text-primary font-semibold">
                        <div className="flex items-center gap-2">
                          <ColorDot color={ing.color} size="md" />
                          {ing.code}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                      <TableCell className="text-right">{ing.purchase_quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {ing.purchase_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {ing.correction_factor && ing.correction_factor > 1 ? (
                          <span className="text-primary font-medium">{ing.correction_factor.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">1.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        R$ {ing.unit_price?.toFixed(2) || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(ing)}
                            title="Editar insumo"
                            className="hover:bg-primary/10 hover:text-primary h-9 w-9 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0" 
                            onClick={() => handleDeleteClick(ing)}
                            title="Excluir insumo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
              Tem certeza que deseja excluir o insumo{" "}
              <span className="font-semibold text-foreground">
                "{ingredientToDelete?.name}"
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
    </div>
  );
}
