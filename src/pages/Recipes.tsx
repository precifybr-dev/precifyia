import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileSpreadsheet, 
  ArrowLeft,
  Menu,
  LogOut,
  LayoutDashboard,
  Building2,
  Package,
  Wine,
  ChevronRight,
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Percent
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
import { IngredientSelector, type IngredientData } from "@/components/recipes/IngredientSelector";
import { formatIngredientCode, calculateIngredientCost, convertToBaseUnit } from "@/lib/ingredient-utils";

interface RecipeIngredient {
  id: string;
  ingredientId: string | null;
  ingredientCode: number | null;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  baseUnit: string;
  cost: number;
}

const units = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (L)" },
  { value: "un", label: "Unidade (un)" },
];

export default function Recipes() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  
  // Recipe form state
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState("1");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [profitMargin, setProfitMargin] = useState("");
  
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
      setIngredients(data as IngredientData[]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const handleNewRecipe = () => {
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([createEmptyIngredient()]);
    // Usa a margem padrão do perfil, se disponível
    setProfitMargin(profile?.default_profit_margin?.toString() || "30");
    setShowForm(true);
  };

  const createEmptyIngredient = (): RecipeIngredient => ({
    id: crypto.randomUUID(),
    ingredientId: null,
    ingredientCode: null,
    name: "",
    quantity: "",
    unit: "g",
    unitPrice: 0,
    baseUnit: "kg",
    cost: 0,
  });

  const handleSelectIngredient = (index: number, ing: IngredientData) => {
    const unitPrice = ing.unit_price ?? (ing.purchase_price / ing.purchase_quantity);
    
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      
      // Mantém a quantidade se já existir e recalcula o custo
      const qty = parseFloat(current.quantity) || 0;
      const cost = qty > 0 ? calculateIngredientCost(unitPrice, qty, current.unit, ing.unit) : 0;
      
      updated[index] = {
        ...current,
        ingredientId: ing.id,
        ingredientCode: ing.code,
        name: ing.name,
        unitPrice: unitPrice,
        baseUnit: ing.unit,
        cost: cost,
      };
      
      return updated;
    });
  };

  const handleQuantityChange = (index: number, value: string) => {
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const qty = parseFloat(value) || 0;
      
      // Recalcula o custo baseado na quantidade em gramas/ml convertida para kg/l
      const cost = qty > 0 && current.unitPrice > 0 
        ? calculateIngredientCost(current.unitPrice, qty, current.unit, current.baseUnit)
        : 0;
      
      updated[index] = {
        ...current,
        quantity: value,
        cost: cost,
      };
      
      return updated;
    });
  };

  const handleUnitChange = (index: number, unit: string) => {
    setRecipeIngredients((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const qty = parseFloat(current.quantity) || 0;
      
      // Recalcula o custo com a nova unidade
      const cost = qty > 0 && current.unitPrice > 0 
        ? calculateIngredientCost(current.unitPrice, qty, unit, current.baseUnit)
        : 0;
      
      updated[index] = {
        ...current,
        unit: unit,
        cost: cost,
      };
      
      return updated;
    });
  };

  const addIngredientRow = () => {
    setRecipeIngredients((prev) => [...prev, createEmptyIngredient()]);
  };

  const removeIngredientRow = (index: number) => {
    if (recipeIngredients.length === 1) return;
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCost = recipeIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  const costPerServing = totalCost / (parseInt(servings) || 1);
  
  // Cálculo do preço de venda baseado na margem de lucro
  // Fórmula: Preço de Venda = CMV / (1 - Margem%)
  const margin = parseFloat(profitMargin) || 0;
  const suggestedPrice = margin < 100 && margin > 0 
    ? costPerServing / (1 - margin / 100) 
    : costPerServing;
  const profit = suggestedPrice - costPerServing;

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      toast({ title: "Erro", description: "Informe o nome da ficha técnica", variant: "destructive" });
      return;
    }

    const validIngredients = recipeIngredients.filter((i) => i.ingredientId && parseFloat(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um insumo com quantidade", variant: "destructive" });
      return;
    }

    // TODO: Salvar no banco de dados quando a tabela de recipes for criada
    toast({ 
      title: "Ficha técnica criada! 🎉", 
      description: `CMV calculado: R$ ${totalCost.toFixed(2)} | Por porção: R$ ${costPerServing.toFixed(2)}` 
    });
    
    setShowForm(false);
    setRecipeName("");
    setServings("1");
    setRecipeIngredients([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "/business" },
    { icon: Package, label: "Insumos", path: "/ingredients" },
    { icon: Wine, label: "Bebidas", path: "/beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "/recipes", active: true },
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
                <h1 className="font-display text-xl font-bold text-foreground">Fichas Técnicas</h1>
                <p className="text-sm text-muted-foreground">Crie e gerencie receitas com cálculo de CMV</p>
              </div>
            </div>
            <Button className="gap-2" onClick={handleNewRecipe}>
              <Plus className="w-4 h-4" />
              Nova Ficha
            </Button>
          </div>
        </header>

        <div className="p-6">
          {showForm ? (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Nova Ficha Técnica</h2>
                    <p className="text-sm text-muted-foreground">Selecione insumos pelo código para montagem rápida</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Dica de uso */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Dica: Use o código do insumo</p>
                  <p className="text-muted-foreground">
                    Digite o número do insumo (ex: #001) para selecionar rapidamente. O custo é calculado automaticamente
                    baseado na quantidade usada. Ex: 50g de um insumo a R$ 11,20/kg = R$ 0,56
                  </p>
                </div>
              </div>

              {/* Recipe info */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    placeholder="Ex: X-Bacon Especial"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rendimento (porções)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </div>

              {/* Ingredients list */}
              <div className="space-y-3 mb-6">
                <Label>Ingredientes da Receita</Label>
                
                {recipeIngredients.map((ing, index) => (
                  <div
                    key={ing.id}
                    className="grid grid-cols-12 gap-3 items-end p-4 bg-muted/50 rounded-lg"
                  >
                    {/* Ingredient selector */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Insumo (busque por código ou nome)
                      </Label>
                      <IngredientSelector
                        ingredients={ingredients}
                        onSelect={(selected) => handleSelectIngredient(index, selected)}
                        selectedId={ing.ingredientId || undefined}
                        placeholder="Digite #001 ou nome..."
                      />
                      {ing.ingredientCode && (
                        <p className="text-xs text-primary mt-1">
                          {formatIngredientCode(ing.ingredientCode)} - {ing.name}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="50"
                        value={ing.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Unidade</Label>
                      <Select
                        value={ing.unit}
                        onValueChange={(value) => handleUnitChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cost (calculated) */}
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Custo</Label>
                      <div className="h-9 px-3 py-2 bg-background border border-input rounded-md flex items-center">
                        <span className={`text-sm font-medium ${ing.cost > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {formatCurrency(ing.cost)}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-9 w-9"
                        onClick={() => removeIngredientRow(index)}
                        disabled={recipeIngredients.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-dashed"
                  onClick={addIngredientRow}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar ingrediente
                </Button>
              </div>

              {/* Cost Summary */}
              <div className="bg-primary/5 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Calculator className="w-5 h-5" />
                  <span className="font-medium">Resumo de Custos (CMV)</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total da Receita</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo por Porção (CMV)</p>
                    <p className="font-display text-2xl font-bold text-primary">
                      {formatCurrency(costPerServing)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-success mb-3">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Precificação</span>
                </div>
                
                <div className="grid sm:grid-cols-4 gap-4 items-end">
                  {/* Margin input */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Margem de Lucro
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        step="1"
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    {profile?.default_profit_margin && (
                      <p className="text-xs text-muted-foreground">
                        Padrão do negócio: {profile.default_profit_margin}%
                      </p>
                    )}
                  </div>

                  {/* Suggested price */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Preço de Venda</p>
                    <p className="font-display text-2xl font-bold text-success">
                      {formatCurrency(suggestedPrice)}
                    </p>
                  </div>

                  {/* Profit */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Lucro por Porção
                    </p>
                    <p className="font-display text-xl font-bold text-foreground">
                      {formatCurrency(profit)}
                    </p>
                  </div>

                  {/* CMV percentage */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CMV %</p>
                    <p className="font-display text-xl font-bold text-muted-foreground">
                      {suggestedPrice > 0 ? ((costPerServing / suggestedPrice) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveRecipe} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Ficha Técnica
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Nenhuma ficha técnica cadastrada</h3>
              <p className="text-muted-foreground mb-6">
                Crie fichas técnicas para calcular o CMV e precificar seus produtos.
              </p>
              <Button onClick={handleNewRecipe}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Ficha Técnica
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
