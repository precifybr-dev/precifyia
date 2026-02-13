import { useState } from "react";
import {
  Sparkles, TrendingUp, Target, ShoppingBag, RotateCcw, Users, Zap,
  ArrowRight, ArrowLeft, Loader2, Check, FlaskConical, Crown,
  ShoppingCart, Smartphone, Anchor, CalendarDays, TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const OBJECTIVES = [
  { id: "ticket_medio", label: "Aumentar ticket médio", icon: TrendingUp, description: "Aumente o valor médio dos pedidos" },
  { id: "conversao_ifood", label: "Melhorar conversão no iFood", icon: Smartphone, description: "Otimize para mais vendas no delivery" },
  { id: "produto_ancora", label: "Criar produto âncora", icon: Anchor, description: "Produto de referência no cardápio" },
  { id: "girar_estoque", label: "Girar estoque parado", icon: RotateCcw, description: "Venda itens com baixa saída" },
  { id: "dias_fracos", label: "Vender mais em dias fracos", icon: CalendarDays, description: "Promoção para seg-qua" },
  { id: "combo_familia", label: "Criar combo família", icon: Users, description: "Combo para grupos e famílias" },
  { id: "teste_estrategico", label: "Teste estratégico", icon: TestTube, description: "Teste rápido de combinação" },
];

interface AvailableItem {
  id: string;
  name: string;
  type: "recipe" | "beverage";
  price: number;
  cost: number;
  category?: string;
}

interface ComboCreationWizardProps {
  recipes: AvailableItem[];
  beverages: AvailableItem[];
  isGenerating: boolean;
  canGenerate: boolean;
  isFree: boolean;
  onGenerate: (objective: string, selectedItems?: string[]) => void;
  onCancel: () => void;
}

export function ComboCreationWizard({
  recipes,
  beverages,
  isGenerating,
  canGenerate,
  isFree,
  onGenerate,
  onCancel,
}: ComboCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [autoMode, setAutoMode] = useState(true);

  const allItems: AvailableItem[] = [
    ...recipes.map(r => ({ ...r, type: "recipe" as const })),
    ...beverages.map(b => ({ ...b, type: "beverage" as const })),
  ];

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (!selectedObjective) return;
    const items = autoMode ? undefined : selectedItems.length > 0 ? selectedItems : undefined;
    onGenerate(selectedObjective, items);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (!canGenerate) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Crown className="w-10 h-10 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Limite mensal atingido</h3>
          <p className="text-sm text-muted-foreground mb-4">Desbloqueie 3 usos extras por R$ 9,99</p>
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Sparkles className="w-4 h-4" /> Em breve
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step indicators
  const steps = [
    { num: 1, label: "Objetivo" },
    { num: 2, label: "Itens (opcional)" },
    { num: 3, label: "Gerar" },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Criar Combo Estratégico</CardTitle>
            <CardDescription>Foco em delivery e iFood</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={cn("text-xs hidden sm:inline", step >= s.num ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={cn("w-8 h-0.5", step > s.num ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* STEP 1: Objective */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground mb-2">
              Qual o objetivo deste combo no delivery?
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedObjective(obj.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    selectedObjective === obj.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <obj.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">{obj.label}</span>
                    <span className="text-[11px] text-muted-foreground">{obj.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-3">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedObjective}
                className="gap-2"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Manual selection (optional) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant={autoMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setAutoMode(true); setSelectedItems([]); }}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Automático (IA escolhe)
              </Button>
              <Button
                variant={!autoMode ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoMode(false)}
              >
                <ShoppingCart className="w-4 h-4 mr-1" /> Selecionar itens
              </Button>
            </div>

            {autoMode ? (
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">A IA selecionará os melhores itens</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Com base no seu cardápio, custos e objetivo escolhido
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {recipes.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2">
                        Lanches / Pratos ({recipes.length})
                      </p>
                      {recipes.map(item => (
                        <label
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedItems.includes(item.id)
                              ? "bg-primary/5 border border-primary/20"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <span className="text-sm font-medium flex-1">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(item.price)}</span>
                        </label>
                      ))}
                    </>
                  )}
                  {beverages.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2 mt-3">
                        Bebidas ({beverages.length})
                      </p>
                      {beverages.map(item => (
                        <label
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedItems.includes(item.id)
                              ? "bg-primary/5 border border-primary/20"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <span className="text-sm font-medium flex-1">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(item.price)}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2">
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm & Generate */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Objetivo</Badge>
                <span className="text-sm font-medium">{OBJECTIVES.find(o => o.id === selectedObjective)?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Seleção</Badge>
                <span className="text-sm font-medium">
                  {autoMode ? "Automática (IA)" : `${selectedItems.length} item(ns) selecionado(s)`}
                </span>
              </div>
              {isFree && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Plano Free: resultado será uma simulação
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2 bg-primary"
                size="lg"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isGenerating ? "Gerando combo..." : "Gerar Combo com IA"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
