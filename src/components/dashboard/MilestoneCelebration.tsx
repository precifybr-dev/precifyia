import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PartyPopper, Sparkles, Lock } from "lucide-react";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useUpgradeTracking } from "@/hooks/useUpgradeTracking";

interface MilestoneCelebrationProps {
  recipesCount: number;
  ingredientsCount: number;
}

interface Milestone {
  key: string;
  title: string;
  description: string;
  proHint: string;
  condition: (r: number, i: number) => boolean;
}

const MILESTONES: Milestone[] = [
  {
    key: "first_recipe",
    title: "Primeira ficha técnica criada! 🎉",
    description: "Você já sabe exatamente quanto custa produzir este produto. Isso é clareza real.",
    proHint: "No Pro, você cria fichas ilimitadas e descobre todas as margens do seu cardápio.",
    condition: (r) => r === 1,
  },
  {
    key: "three_recipes",
    title: "3 fichas técnicas! Você está construindo uma base sólida 💪",
    description: "Com 3 produtos precificados, você já tem uma visão comparativa do seu cardápio.",
    proHint: "No Pro, análises de IA revelam quais produtos estão drenando sua margem e quais são suas estrelas.",
    condition: (r) => r === 3,
  },
  {
    key: "five_ingredients",
    title: "5 insumos cadastrados! 📦",
    description: "Sua base de insumos está crescendo. Cada insumo precificado é menos erro na sua margem.",
    proHint: "No Pro, insumos ilimitados e importação em massa via planilha aceleram em 10x.",
    condition: (_, i) => i === 5,
  },
];

const DISMISSED_KEY = "precify_milestones_dismissed";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismiss(key: string) {
  const dismissed = getDismissed();
  if (!dismissed.includes(key)) {
    dismissed.push(key);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
}

export function MilestoneCelebration({ recipesCount, ingredientsCount }: MilestoneCelebrationProps) {
  const { userPlan } = usePlanFeatures();
  const { trackMilestone, trackUpgradeClicked } = useUpgradeTracking();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const dismissed = getDismissed();
    
    for (const ms of MILESTONES) {
      if (ms.condition(recipesCount, ingredientsCount) && !dismissed.includes(ms.key)) {
        setActiveMilestone(ms);
        if (!trackedRef.current.has(ms.key)) {
          trackedRef.current.add(ms.key);
          trackMilestone(ms.key, { recipes: recipesCount, ingredients: ingredientsCount });
        }
        return;
      }
    }
    
    setActiveMilestone(null);
  }, [recipesCount, ingredientsCount]);

  if (!activeMilestone || userPlan === "pro") return null;

  const handleDismiss = () => {
    dismiss(activeMilestone.key);
    setActiveMilestone(null);
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="absolute top-2 right-2">
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-muted transition-colors">
              Fechar
            </button>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <PartyPopper className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 pr-12">
              <h3 className="text-sm font-bold text-foreground">{activeMilestone.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{activeMilestone.description}</p>
              
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{activeMilestone.proHint}</p>
              </div>

              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  trackUpgradeClicked(`milestone_${activeMilestone.key}`);
                  setShowUpgrade(true);
                }}
              >
                Desbloquear mais <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PlanUpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={userPlan}
        feature="upgrade"
      />
    </>
  );
}
