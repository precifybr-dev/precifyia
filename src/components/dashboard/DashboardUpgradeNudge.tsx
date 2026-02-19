import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Lock, TrendingUp, Sparkles, AlertTriangle } from "lucide-react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";
import { useUpgradeTracking } from "@/hooks/useUpgradeTracking";

interface DashboardUpgradeNudgeProps {
  recipesCount: number;
  ingredientsCount: number;
}

export function DashboardUpgradeNudge({ recipesCount, ingredientsCount }: DashboardUpgradeNudgeProps) {
  const { userPlan, getFeatureLimit, loading } = usePlanFeatures();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { trackUpgradeViewed, trackUpgradeClicked, trackLimitReached } = useUpgradeTracking();
  const navigate = useNavigate();

  const recipeLimit = getFeatureLimit("recipes");
  const ingredientLimit = getFeatureLimit("ingredients");

  const recipeUsage = recipeLimit && recipeLimit > 0 ? (recipesCount / recipeLimit) * 100 : 0;
  const ingredientUsage = ingredientLimit && ingredientLimit > 0 ? (ingredientsCount / ingredientLimit) * 100 : 0;

  const isNearRecipeLimit = recipeLimit !== null && recipeLimit > 0 && recipeUsage >= 70;
  const isNearIngredientLimit = ingredientLimit !== null && ingredientLimit > 0 && ingredientUsage >= 70;
  const hasNearLimit = isNearRecipeLimit || isNearIngredientLimit;

  useEffect(() => {
    if (!loading && userPlan !== "pro" && hasNearLimit) {
      trackLimitReached(
        isNearRecipeLimit ? "recipes" : "ingredients",
        isNearRecipeLimit ? recipesCount : ingredientsCount,
        isNearRecipeLimit ? (recipeLimit || 0) : (ingredientLimit || 0)
      );
    }
  }, [loading, hasNearLimit]);

  if (loading || userPlan === "pro") return null;

  const handleUpgrade = (source: string) => {
    trackUpgradeClicked(source);
    setShowUpgrade(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Near-limit alert */}
        {hasNearLimit && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Você está perto de atingir seus limites</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quando os limites são atingidos, você pode estar deixando oportunidades na mesa.
                    </p>
                  </div>
                  {isNearRecipeLimit && recipeLimit && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fichas técnicas</span>
                        <span className="font-medium text-foreground">{recipesCount} / {recipeLimit}</span>
                      </div>
                      <Progress value={recipeUsage} className="h-1.5 [&>div]:bg-destructive" />
                    </div>
                  )}
                  {isNearIngredientLimit && ingredientLimit && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Insumos</span>
                        <span className="font-medium text-foreground">{ingredientsCount} / {ingredientLimit}</span>
                      </div>
                      <Progress value={ingredientUsage} className="h-1.5 [&>div]:bg-destructive" />
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleUpgrade("dashboard_limit_alert")}>
                    Expandir limites <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strategic potential card */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {userPlan === "free"
                    ? "Você está vendo apenas a camada inicial"
                    : "Existem camadas avançadas não exploradas"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userPlan === "free"
                    ? "Seu diagnóstico atual mostra o cenário base. Estratégias de multiplicação, sub-receitas e otimização de escala estão bloqueadas."
                    : "Sua estrutura já indica capacidade de operar em nível avançado. Multi-loja, DRE completo e análises ilimitadas aguardam."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(userPlan === "free"
                    ? ["Sub-receitas", "Combos ilimitados", "Dashboard completo"]
                    : ["Multi-loja", "DRE avançado", "WhatsApp"]
                  ).map((feat) => (
                    <Badge key={feat} variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                      <Lock className="h-2.5 w-2.5" /> {feat}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" className="gap-1.5 mt-1" onClick={() => handleUpgrade("dashboard_potential")}>
                  Desbloquear potencial <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlanUpgradePrompt
        open={showUpgrade}
        onOpenChange={(open) => {
          setShowUpgrade(open);
          if (!open) trackUpgradeViewed("dashboard");
        }}
        currentPlan={userPlan}
        feature="upgrade"
      />
    </>
  );
}
