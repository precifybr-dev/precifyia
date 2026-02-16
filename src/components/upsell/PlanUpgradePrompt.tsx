import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Check } from "lucide-react";

interface PlanUpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  feature: string;
  limitReached?: string;
}

const PLAN_BENEFITS: Record<string, string[]> = {
  basic: [
    "Até 8 fichas técnicas",
    "5 análises de cardápio/mês",
    "Importação de planilha",
    "Dashboard completo",
  ],
  pro: [
    "Fichas técnicas ilimitadas",
    "10 análises de cardápio/mês",
    "Até 3 lojas (limites por conta)",
    "Combos estratégicos com IA",
    "Dashboard avançado + DRE",
  ],
};

const PLAN_PRICES: Record<string, string> = {
  basic: "R$ 97,00",
  pro: "R$ 147,00",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  pro: "Pro",
};

export function PlanUpgradePrompt({
  open,
  onOpenChange,
  currentPlan,
  feature,
  limitReached,
}: PlanUpgradePromptProps) {
  const navigate = useNavigate();
  const suggestedPlan = currentPlan === "free" ? "basic" : "pro";
  const benefits = PLAN_BENEFITS[suggestedPlan] || PLAN_BENEFITS.pro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {PLAN_LABELS[currentPlan]} → {PLAN_LABELS[suggestedPlan]}
            </Badge>
          </div>
          <DialogTitle>Desbloqueie mais poder 🚀</DialogTitle>
          <DialogDescription>
            {limitReached
              ? `Você atingiu o limite de ${limitReached} no plano ${PLAN_LABELS[currentPlan]}.`
              : `A funcionalidade "${feature}" está disponível no plano ${PLAN_LABELS[suggestedPlan]}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium">
            Com o plano {PLAN_LABELS[suggestedPlan]} você ganha:
          </p>
          <ul className="space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-2xl font-bold text-primary">
              {PLAN_PRICES[suggestedPlan]}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={() => onOpenChange(false)}>
            Fazer Upgrade <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
