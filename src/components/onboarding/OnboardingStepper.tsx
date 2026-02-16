import { Progress } from "@/components/ui/progress";
import type { OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
}

const stepLabels: Record<string, { label: string; index: number }> = {
  business: { label: "Configuração", index: 0 },
  ingredients: { label: "Insumos", index: 1 },
  recipe: { label: "Ficha Técnica", index: 2 },
};

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  const total = 3;
  const current = stepLabels[currentStep]?.index ?? 0;
  const progress = ((current) / total) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <Progress value={progress} className="h-1" />
      <div className="flex justify-between mt-2">
        {Object.entries(stepLabels).map(([key, { label, index }]) => (
          <span
            key={key}
            className={`text-xs font-medium ${
              index <= current ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
