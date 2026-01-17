import { Check, Building2, Package, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
}

const steps = [
  {
    id: "business" as const,
    label: "Configurar Negócio",
    description: "Dados básicos e custos",
    icon: Building2,
  },
  {
    id: "ingredients" as const,
    label: "Adicionar Insumos",
    description: "Cadastre ingredientes",
    icon: Package,
  },
  {
    id: "recipe" as const,
    label: "Criar Ficha Técnica",
    description: "Monte sua primeira receita",
    icon: FileSpreadsheet,
  },
];

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  const stepOrder: OnboardingStep[] = ["business", "ingredients", "recipe", "completed"];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {steps.map((step, index) => {
          const isCompleted = currentIndex > index;
          const isCurrent = step.id === currentStep;
          const isPending = currentIndex < index;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted && "bg-success text-success-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </div>
                <div className="mt-2 text-center hidden md:block">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-primary",
                      isCompleted && "text-success",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 md:w-16 lg:w-24 h-1 mx-2 rounded-full transition-all duration-300",
                    currentIndex > index ? "bg-success" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile labels */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-sm font-medium text-primary">
          {steps.find((s) => s.id === currentStep)?.label}
        </p>
        <p className="text-xs text-muted-foreground">
          Passo {currentIndex + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}
