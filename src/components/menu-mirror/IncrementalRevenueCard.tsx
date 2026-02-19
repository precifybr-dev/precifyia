import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  DollarSign,
  ArrowRight,
  Calculator,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";
import { useIncrementalRevenue, type IncrementalRevenueResult } from "@/hooks/useIncrementalRevenue";
import { useEventTracking } from "@/hooks/useEventTracking";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import { useNavigate } from "react-router-dom";

interface PriceAdjustment {
  product: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
}

interface IncrementalRevenueCardProps {
  priceAdjustments: PriceAdjustment[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function UsageCounter({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) return null;
  const percent = (used / limit) * 100;
  const isNearLimit = percent >= 80;

  return (
    <div className="w-full max-w-xs mt-3">
      <p className={`text-xs ${isNearLimit ? "text-orange-500" : "text-muted-foreground"}`}>
        Você utilizou {used} de {limit} análises estratégicas disponíveis no Teste.
      </p>
      <Progress
        value={percent}
        className={`h-1.5 mt-1 ${isNearLimit ? "[&>div]:bg-orange-500" : ""}`}
      />
    </div>
  );
}

function UpgradeLimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { trackEvent: trackFunnel } = useFunnelTracking();

  const handleUpgrade = () => {
    trackFunnel("incremental_revenue_upgrade_click", "incremental_revenue_limit");
    navigate("/app/plan");
    onClose();
  };

  const handleViewPlans = () => {
    trackFunnel("incremental_revenue_upgrade_click", "incremental_revenue_view_plans");
    navigate("/app/plan");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Você atingiu o limite de análises estratégicas do Teste
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed pt-2">
            Os ajustes realizados já mostraram impacto financeiro real.
            Para continuar analisando e otimizar todo o seu cardápio, desbloqueie o plano completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3">
          <p className="text-xs font-semibold text-foreground">No plano PRO você pode:</p>
          <ul className="space-y-1.5">
            {[
              "Calcular impacto de todos os itens",
              "Aplicar otimizações ilimitadas",
              "Visualizar crescimento acumulado",
              "Estruturar escala com margem real",
            ].map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleUpgrade} className="w-full gap-2">
            <Lock className="w-4 h-4" />
            Desbloquear Estrutura Completa
          </Button>
          <Button variant="ghost" size="sm" onClick={handleViewPlans} className="text-muted-foreground">
            Ver planos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultCard({ result }: { result: IncrementalRevenueResult }) {
  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          Ajuste Estratégico Identificado
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground">
        Você atualizou o preço de:
      </div>
      <p className="font-bold text-sm text-foreground">{result.productName}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground line-through">
          {formatCurrency(result.originalPrice)}
        </span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(result.newPrice)}
        </span>
      </div>

      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5" />
          Incremento por unidade: +{formatCurrency(result.differencePerUnit)}
        </div>

        <div className="text-xs text-muted-foreground">
          Considerando {result.monthlyVolume.toLocaleString("pt-BR")} unidades por mês:
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Receita incremental estimada:</p>
              <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                {formatCurrency(result.monthlyRevenue)}
                <span className="text-xs font-normal text-muted-foreground ml-1">por mês</span>
              </p>
              <p className="font-bold text-sm text-emerald-600/80 dark:text-emerald-400/80">
                {formatCurrency(result.annualRevenue)}
                <span className="text-xs font-normal text-muted-foreground ml-1">por ano</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Pequenos ajustes de preço geram grande impacto acumulado.
      </p>
      <p className="text-[10px] text-muted-foreground/60">
        Estimativa baseada nas informações inseridas.
      </p>
    </div>
  );
}

export function IncrementalRevenueCard({ priceAdjustments }: IncrementalRevenueCardProps) {
  const { usage, fetchUsage, canCalculate, isAtLimit, recordUsage, calculateRevenue } = useIncrementalRevenue();
  const { trackFeatureUsage } = useEventTracking();
  const { trackEvent: trackFunnel } = useFunnelTracking();

  const [selectedItem, setSelectedItem] = useState<PriceAdjustment | null>(null);
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [result, setResult] = useState<IncrementalRevenueResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Filter only items with positive price increase
  const positiveAdjustments = priceAdjustments.filter(
    (a) => a.suggestedPrice > a.currentPrice
  );

  if (positiveAdjustments.length === 0) return null;

  const handleCalculate = async (adjustment: PriceAdjustment) => {
    // Track detection
    trackFunnel("price_adjustment_detected", undefined, {
      product: adjustment.product,
      original: adjustment.currentPrice,
      suggested: adjustment.suggestedPrice,
    });
    trackFeatureUsage("price_adjustment_detected", {
      product: adjustment.product,
    });

    if (isAtLimit()) {
      trackFunnel("incremental_revenue_limit_reached");
      trackFeatureUsage("incremental_revenue_limit_reached");
      setShowUpgradeModal(true);
      return;
    }

    setSelectedItem(adjustment);
    setMonthlyVolume("");
    setResult(null);
  };

  const handleSubmitVolume = async () => {
    if (!selectedItem) return;
    const volume = parseInt(monthlyVolume, 10);
    if (!volume || volume <= 0) return;

    const calcResult = calculateRevenue(
      selectedItem.product,
      selectedItem.currentPrice,
      selectedItem.suggestedPrice,
      volume,
    );

    if (!calcResult) return;

    // Record usage
    const recorded = await recordUsage({
      product: selectedItem.product,
      original_price: selectedItem.currentPrice,
      new_price: selectedItem.suggestedPrice,
      monthly_volume: volume,
      monthly_revenue: calcResult.monthlyRevenue,
      annual_revenue: calcResult.annualRevenue,
    });

    if (recorded) {
      setResult(calcResult);
      setCalculatedItems(prev => new Set(prev).add(selectedItem.product));

      // Track events
      trackFunnel("incremental_revenue_calculated", undefined, {
        product: selectedItem.product,
        monthly_revenue: calcResult.monthlyRevenue,
        annual_revenue: calcResult.annualRevenue,
      });
      trackFeatureUsage("incremental_revenue_calculated", {
        product: selectedItem.product,
        monthly_revenue: calcResult.monthlyRevenue,
      });

      // Track usage count
      if (usage) {
        trackFeatureUsage("incremental_revenue_usage_count", {
          used: usage.used + 1,
          limit: usage.limit,
        });
      }
    }
  };

  return (
    <>
      <Card className="border-emerald-200 dark:border-emerald-800/50">
        <CardContent className="p-4 space-y-4">
          <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Receita Incremental Projetada
          </h4>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Calcule o impacto financeiro de cada ajuste de preço sugerido. Descubra quanto potencial acumulado existe no seu cardápio.
          </p>

          {/* List of calculable items */}
          <div className="space-y-2">
            {positiveAdjustments.map((adj, i) => {
              const diff = adj.suggestedPrice - adj.currentPrice;
              const alreadyCalculated = calculatedItems.has(adj.product);
              const isSelected = selectedItem?.product === adj.product;

              return (
                <div key={i} className="space-y-2">
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{adj.product}</p>
                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                        <span className="text-muted-foreground line-through">
                          {formatCurrency(adj.currentPrice)}
                        </span>
                        <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatCurrency(adj.suggestedPrice)}
                        </span>
                        <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-600 dark:text-emerald-400 ml-1">
                          +{formatCurrency(diff)}
                        </Badge>
                      </div>
                    </div>

                    {alreadyCalculated ? (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Calculator className="w-3 h-3" />
                        Calculado
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCalculate(adj)}
                        className="text-emerald-600 dark:text-emerald-400 gap-1 text-xs h-7 px-2"
                      >
                        <Calculator className="w-3 h-3" />
                        Calcular
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {/* Volume input for selected item */}
                  {isSelected && !result && (
                    <div className="pl-3 border-l-2 border-emerald-300 dark:border-emerald-700 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                      <p className="text-xs text-muted-foreground">
                        Quantas unidades por mês você vende deste item? (estimativa)
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={monthlyVolume}
                          onChange={(e) => setMonthlyVolume(e.target.value)}
                          placeholder="Ex: 400"
                          className="h-8 text-sm max-w-[140px]"
                          onKeyDown={(e) => e.key === "Enter" && handleSubmitVolume()}
                        />
                        <Button
                          size="sm"
                          onClick={handleSubmitVolume}
                          disabled={!monthlyVolume || parseInt(monthlyVolume, 10) <= 0}
                          className="h-8 gap-1 text-xs"
                        >
                          <TrendingUp className="w-3 h-3" />
                          Projetar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Result for selected item */}
                  {isSelected && result && (
                    <div className="pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
                      <ResultCard result={result} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(null);
                          setResult(null);
                          setMonthlyVolume("");
                        }}
                        className="mt-2 text-xs text-muted-foreground"
                      >
                        Fechar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Usage counter */}
          {usage && usage.limit !== null && (
            <UsageCounter used={usage.used} limit={usage.limit} />
          )}
        </CardContent>
      </Card>

      <UpgradeLimitModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
