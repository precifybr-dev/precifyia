import { useState, useEffect } from "react";
import {
  Plus, Minus, Trash2, Sparkles, Loader2, ArrowRight, ArrowLeft,
  ShoppingBag, TrendingUp, Users, Target, Zap, Tag, Shield,
  AlertTriangle, AlertCircle, Info, Check, Crown, ChefHat,
  DollarSign, Percent, Save, RotateCcw, Smartphone, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useManualCombo, type ManualComboItem } from "@/hooks/useManualCombo";
import { type AvailableItem } from "@/hooks/useCombos";
import { supabase } from "@/integrations/supabase/client";

const STRATEGY_ICONS: Record<string, React.ElementType> = {
  ticket_medio: TrendingUp,
  percepcao_vantagem: Tag,
  dias_fracos: Zap,
  combo_familia: Users,
  item_isca: Target,
  promo_controlada: Shield,
};

interface ManualComboBuilderProps {
  recipes: AvailableItem[];
  beverages: AvailableItem[];
  onSaved: () => void;
}

export function ManualComboBuilder({ recipes, beverages, onSaved }: ManualComboBuilderProps) {
  const {
    selectedItems, selectedStrategy, strategies, result,
    generatedDetails, isGeneratingDetails, isSaving,
    addItem, removeItem, updateQuantity, setSelectedStrategy,
    generateDetails, saveCombo, reset,
  } = useManualCombo();

  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, string[]>>({});

  // Fetch ingredients for recipes
  useEffect(() => {
    const fetchIngredients = async () => {
      const recipeIds = recipes.map(r => r.id);
      if (recipeIds.length === 0) return;
      const { data } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id, ingredients(name)")
        .in("recipe_id", recipeIds);
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach((ri: any) => {
          if (!map[ri.recipe_id]) map[ri.recipe_id] = [];
          if (ri.ingredients?.name) map[ri.recipe_id].push(ri.ingredients.name);
        });
        setIngredientsMap(map);
      }
    };
    fetchIngredients();
  }, [recipes]);

  const allItems: AvailableItem[] = [
    ...recipes.map(r => ({ ...r, type: "recipe" as const })),
    ...beverages.map(b => ({ ...b, type: "beverage" as const })),
  ];

  const filteredItems = searchTerm
    ? allItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allItems;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleAddItem = (item: AvailableItem) => {
    addItem(
      { id: item.id, name: item.name, type: item.type, price: item.price, cost: item.cost, category: item.category },
      ingredientsMap[item.id]
    );
  };

  const handleSave = async () => {
    const ok = await saveCombo();
    if (ok) {
      reset();
      setStep(1);
      onSaved();
    }
  };

  const steps = [
    { num: 1, label: "Selecionar Itens" },
    { num: 2, label: "Estratégia" },
    { num: 3, label: "Resumo" },
  ];

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.num === 1 || (s.num === 2 && selectedItems.length > 0) || (s.num === 3 && selectedStrategy)) {
                  setStep(s.num);
                }
              }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </button>
            <span className={cn("text-xs hidden sm:inline", step >= s.num ? "text-foreground font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={cn("w-6 sm:w-10 h-0.5", step > s.num ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Item Selection */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Selecionar Itens do Combo
            </CardTitle>
            <CardDescription>
              Escolha os produtos já precificados e defina a quantidade de cada um.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Available items */}
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                {recipes.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2">
                      🍔 Lanches / Pratos ({recipes.filter(r => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase())).length})
                    </p>
                    {filteredItems.filter(i => i.type === "recipe").map(item => {
                      const isAdded = selectedItems.some(s => s.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left",
                            isAdded ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Custo: {formatCurrency(item.cost)} · Venda: {formatCurrency(item.price)}
                            </span>
                          </div>
                          {isAdded ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Adicionado</Badge>
                          ) : (
                            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
                {beverages.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2 mt-2">
                      🥤 Bebidas ({beverages.filter(b => !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase())).length})
                    </p>
                    {filteredItems.filter(i => i.type === "beverage").map(item => {
                      const isAdded = selectedItems.some(s => s.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left",
                            isAdded ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Custo: {formatCurrency(item.cost)} · Venda: {formatCurrency(item.price)}
                            </span>
                          </div>
                          {isAdded ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Adicionado</Badge>
                          ) : (
                            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Selected items with quantity controls */}
            {selectedItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    Itens selecionados ({selectedItems.length})
                  </p>
                  <div className="space-y-2">
                    {selectedItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(item.cost)} custo · {formatCurrency(item.price)} venda · Margem {item.margin.toFixed(0)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick preview */}
                {result && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Avulso</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(result.totalAvulso)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Custo</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(result.totalCost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Mín s/ Prejuízo</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(result.minPriceNoLoss)}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={reset} className="gap-2 text-muted-foreground">
                <RotateCcw className="w-4 h-4" /> Limpar
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={selectedItems.length === 0}
                className="gap-2"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Strategy Selection */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Qual estratégia aplicar?
            </CardTitle>
            <CardDescription>
              A estratégia influencia o preço sugerido e a percepção de vantagem do cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {strategies.map(s => {
              const Icon = STRATEGY_ICONS[s.id] || Target;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategy(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                    selectedStrategy === s.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    selectedStrategy === s.id ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground block">{s.label}</span>
                    <span className="text-[11px] text-muted-foreground">{s.description}</span>
                  </div>
                  {selectedStrategy === s.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}

            <div className="flex justify-between pt-3">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedStrategy}
                className="gap-2"
              >
                Ver Resumo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Summary & Actions */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* Items summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                Itens do Combo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-md flex items-center justify-center">
                      {item.quantity}x
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {item === result.analysis.baitItem && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-warning/40 text-warning">Isca</Badge>
                        )}
                        {item === result.analysis.profitDriver && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-success/40 text-success">Sustenta lucro</Badge>
                        )}
                        <span>Margem {item.margin.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-foreground">{formatCurrency(item.price * item.quantity)}</p>
                    <p className="text-[10px] text-muted-foreground">Custo: {formatCurrency(item.cost * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryCard label="Preço Avulso" value={formatCurrency(result.totalAvulso)} icon={<ShoppingBag className="w-3.5 h-3.5" />} />
                <SummaryCard label="Custo Total" value={formatCurrency(result.totalCost)} />
                <SummaryCard
                  label="Mín. Sem Prejuízo"
                  value={formatCurrency(result.minPriceNoLoss)}
                  className="border-destructive/20 bg-destructive/5"
                  valueClass="text-destructive"
                />
                <SummaryCard
                  label="Preço Recomendado"
                  value={formatCurrency(result.safePriceSuggestion)}
                  className="border-primary/20 bg-primary/5"
                  valueClass="text-primary"
                  icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                  sublabel="Seguro"
                />
                <SummaryCard
                  label="Preço Agressivo"
                  value={formatCurrency(result.aggressivePriceSuggestion)}
                  className="border-warning/20 bg-warning/5"
                  valueClass="text-warning"
                  icon={<Zap className="w-3.5 h-3.5 text-warning" />}
                  sublabel="+ Conversão"
                />
                <SummaryCard
                  label="Lucro Estimado"
                  value={formatCurrency(result.estimatedProfit)}
                  className="border-success/20 bg-success/5"
                  valueClass="text-success"
                  icon={<TrendingUp className="w-3.5 h-3.5 text-success" />}
                />
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <Percent className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{result.estimatedMargin.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Margem</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
                  <Tag className="w-4 h-4 mx-auto text-success mb-1" />
                  <p className="text-lg font-bold text-success">{formatCurrency(result.clientSavings)}</p>
                  <p className="text-[10px] text-muted-foreground">Economia cliente</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{result.clientSavingsPercent.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground">Desconto percebido</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategic Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Análise Estratégica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.analysis.baitItem && (
                <AnalysisRow
                  icon={<Target className="w-4 h-4 text-warning" />}
                  label="Item isca (atrai o cliente)"
                  value={result.analysis.baitItem.name}
                  detail={`Margem: ${result.analysis.baitItem.margin.toFixed(0)}%`}
                />
              )}
              {result.analysis.profitDriver && (
                <AnalysisRow
                  icon={<TrendingUp className="w-4 h-4 text-success" />}
                  label="Sustenta o lucro"
                  value={result.analysis.profitDriver.name}
                  detail={`Margem: ${result.analysis.profitDriver.margin.toFixed(0)}%`}
                />
              )}
              {result.analysis.costLeader && (
                <AnalysisRow
                  icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
                  label="Maior custo no combo"
                  value={result.analysis.costLeader.name}
                  detail={formatCurrency(result.analysis.costLeader.cost * result.analysis.costLeader.quantity)}
                />
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge className={cn(
                  "text-xs",
                  result.analysis.isBalanced
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                )}>
                  {result.analysis.isBalanced ? "✅ Combo equilibrado" : "⚠️ Combo precisa de ajustes"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {result.analysis.alerts.length > 0 && (
            <Card className="border-warning/30">
              <CardContent className="pt-4 space-y-2">
                {result.analysis.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-lg text-sm",
                      alert.type === "danger" && "bg-destructive/5 border border-destructive/20 text-destructive",
                      alert.type === "warning" && "bg-warning/5 border border-warning/20 text-warning",
                      alert.type === "info" && "bg-accent/10 border border-accent/20 text-foreground"
                    )}
                  >
                    {alert.type === "danger" && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {alert.type === "warning" && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {alert.type === "info" && <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Generated Analysis */}
          {generatedDetails ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Análise IA do Combo</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{generatedDetails.name}</h3>
                <p className="text-sm text-foreground/80">{generatedDetails.description}</p>
                {generatedDetails.ingredientsDescription && (
                  <p className="text-xs text-muted-foreground italic">🧾 {generatedDetails.ingredientsDescription}</p>
                )}
                <Separator className="my-2" />
                {generatedDetails.discountItemExplanation && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <Tag className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-0.5">Item com desconto</p>
                      <p className="text-sm text-foreground">{generatedDetails.discountItemExplanation}</p>
                    </div>
                  </div>
                )}
                {generatedDetails.profitItemExplanation && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                    <TrendingUp className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-0.5">Item que sustenta o lucro</p>
                      <p className="text-sm text-foreground">{generatedDetails.profitItemExplanation}</p>
                    </div>
                  </div>
                )}
                {generatedDetails.strategyExplanation && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Target className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-0.5">Estratégia aplicada</p>
                      <p className="text-sm text-foreground">{generatedDetails.strategyExplanation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={generateDetails}
              disabled={isGeneratingDetails}
              variant="outline"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              {isGeneratingDetails ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGeneratingDetails ? "Gerando nome e descrição..." : "Gerar Nome e Descrição com IA"}
            </Button>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { reset(); setStep(1); }} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Novo combo
              </Button>
              <Button
                onClick={handleSave}
                disabled={!generatedDetails || isSaving}
                className="gap-2"
                size="lg"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Salvando..." : "Salvar Combo"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, className, valueClass, icon, sublabel }: {
  label: string; value: string; className?: string; valueClass?: string; icon?: React.ReactNode; sublabel?: string;
}) {
  return (
    <div className={cn("p-3 rounded-lg border border-border text-center", className)}>
      {icon && <div className="flex justify-center mb-0.5">{icon}</div>}
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("font-bold text-sm", valueClass || "text-foreground")}>{value}</p>
      {sublabel && <p className="text-[9px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function AnalysisRow({ icon, label, value, detail }: {
  icon: React.ReactNode; label: string; value: string; detail: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      {icon}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}
