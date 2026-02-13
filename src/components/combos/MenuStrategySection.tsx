import { useState } from "react";
import {
  Crown, Sparkles, Loader2, Anchor, Crosshair, ShoppingBag,
  TrendingUp, ShieldAlert, LayoutList, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STRATEGIES = [
  { id: "ancora_alta", label: "Âncora de Preço Alta", icon: Anchor, description: "Use um item caro no topo para fazer os outros parecerem baratos" },
  { id: "produto_isca", label: "Produto Isca", icon: Crosshair, description: "Coloque um item irresistível para atrair cliques" },
  { id: "combo_topo", label: "Combo Estratégico no Topo", icon: ShoppingBag, description: "Destaque um combo lucrativo na primeira posição" },
  { id: "ticket_medio", label: "Estratégia de Ticket Médio", icon: TrendingUp, description: "Organize para incentivar pedidos maiores" },
  { id: "anti_abandono", label: "Estratégia Anti-Abandono", icon: ShieldAlert, description: "Reduza abandono de carrinho no iFood" },
];

interface MenuStrategyResult {
  strategy_name: string;
  explanation: string;
  top_items: { position: number; name: string; price: number; reason: string }[];
  conversion_tip: string;
}

interface MenuStrategySectionProps {
  canGenerate: boolean;
  isFree: boolean;
  isGenerating: boolean;
  onGenerate: (strategyId: string) => Promise<MenuStrategyResult | null>;
}

export function MenuStrategySection({ canGenerate, isFree, isGenerating, onGenerate }: MenuStrategySectionProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [result, setResult] = useState<MenuStrategyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedStrategy) return;
    setLoading(true);
    const data = await onGenerate(selectedStrategy);
    if (data) setResult(data);
    setLoading(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (!canGenerate) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Crown className="w-10 h-10 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Limite mensal atingido</h3>
          <p className="text-sm text-muted-foreground mb-4">Cada geração de estratégia conta como 1 uso.</p>
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Sparkles className="w-4 h-4" /> Em breve: pacote extra
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-primary" />
              {result.strategy_name}
            </CardTitle>
            <CardDescription>{result.explanation}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mini menu visual */}
            <div className="rounded-xl border-2 border-primary/20 overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 border-b border-primary/10">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Topo do Cardápio — Simulação iFood
                </p>
              </div>
              <div className="divide-y divide-border">
                {result.top_items.map((item) => (
                  <div key={item.position} className={cn(
                    "flex items-center justify-between px-4 py-3",
                    item.position === 1 && "bg-primary/5"
                  )}>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        item.position === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {item.position}º
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-foreground">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion tip */}
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="text-xs font-semibold text-success mb-1">💡 Por que essa organização converte melhor?</p>
              <p className="text-sm text-foreground">{result.conversion_tip}</p>
            </div>

            <Button variant="outline" onClick={() => { setResult(null); setSelectedStrategy(null); }}>
              Gerar nova estratégia
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estratégia de Topo de Cardápio</CardTitle>
        <CardDescription>
          A IA analisará seu cardápio e reorganizará os 5 primeiros itens para maximizar conversão no iFood.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-foreground">
          Qual estratégia deseja aplicar no topo do seu cardápio?
        </p>
        <div className="space-y-2">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStrategy(s.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                selectedStrategy === s.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block">{s.label}</span>
                <span className="text-[11px] text-muted-foreground">{s.description}</span>
              </div>
              {selectedStrategy === s.id && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>

        {isFree && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-warning" /> Plano Free: resultado será uma simulação
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!selectedStrategy || loading || isGenerating}
            className="gap-2"
            size="lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Analisando cardápio..." : "Gerar Estratégia com IA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
