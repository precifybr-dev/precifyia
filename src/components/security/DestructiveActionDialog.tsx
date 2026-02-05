import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Trash2, Loader2, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationInput } from "./ConfirmationInput";
import { cn } from "@/lib/utils";

export interface ImpactItem {
  label: string;
  count?: number;
  description?: string;
}

interface DestructiveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  warningMessage: string;
  impactItems?: ImpactItem[];
  confirmationWord?: string;
  timerSeconds?: number;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  canRestore?: boolean;
  restoreDays?: number;
}

type Step = "warning" | "impact" | "confirm";

export function DestructiveActionDialog({
  open,
  onOpenChange,
  title,
  itemName,
  warningMessage,
  impactItems = [],
  confirmationWord = "EXCLUIR",
  timerSeconds = 3,
  onConfirm,
  isLoading = false,
  canRestore = true,
  restoreDays = 30,
}: DestructiveActionDialogProps) {
  const [step, setStep] = useState<Step>("warning");
  const [confirmationValid, setConfirmationValid] = useState(false);
  const [countdown, setCountdown] = useState(timerSeconds);
  const [timerStarted, setTimerStarted] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(impactItems.length > 0 ? "warning" : "confirm");
      setConfirmationValid(false);
      setCountdown(timerSeconds);
      setTimerStarted(false);
    }
  }, [open, impactItems.length, timerSeconds]);

  // Countdown timer
  useEffect(() => {
    if (step === "confirm" && !timerStarted) {
      setTimerStarted(true);
    }
  }, [step, timerStarted]);

  useEffect(() => {
    if (timerStarted && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timerStarted, countdown]);

  const handleConfirmationMatch = useCallback((isMatch: boolean) => {
    setConfirmationValid(isMatch);
  }, []);

  const handleNext = () => {
    if (step === "warning") {
      setStep("impact");
    } else if (step === "impact") {
      setStep("confirm");
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep(impactItems.length > 0 ? "impact" : "warning");
    } else if (step === "impact") {
      setStep("warning");
    }
  };

  const canProceed = confirmationValid && countdown === 0;

  const handleConfirm = async () => {
    if (!canProceed) return;
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4">
              {/* Step 1: Warning */}
              {step === "warning" && (
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="font-medium text-destructive">
                          Ação destrutiva detectada
                        </p>
                        <p className="text-sm text-foreground">
                          Você está prestes a excluir{" "}
                          <span className="font-semibold">"{itemName}"</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {warningMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canRestore && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        ✓ Este item pode ser recuperado em até {restoreDays} dias
                        através da Lixeira
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Impact */}
              {step === "impact" && impactItems.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="font-medium text-amber-600 dark:text-amber-400 mb-3">
                      ⚠️ Impacto da exclusão:
                    </p>
                    <ul className="space-y-2">
                      {impactItems.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>
                            {item.label}
                            {item.count !== undefined && (
                              <span className="font-semibold ml-1">
                                ({item.count})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {impactItems.some((i) => i.description) && (
                      <p className="text-sm text-muted-foreground mt-3">
                        {impactItems.find((i) => i.description)?.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <ConfirmationInput
                    expectedValue={confirmationWord}
                    label={`Digite "${confirmationWord}" para confirmar a exclusão`}
                    onMatch={handleConfirmationMatch}
                  />

                  {countdown > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>
                        Aguarde {countdown} segundo{countdown !== 1 ? "s" : ""}{" "}
                        antes de confirmar...
                      </span>
                    </div>
                  )}

                  {countdown === 0 && !confirmationValid && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Digite a palavra de confirmação acima para liberar o botão
                    </p>
                  )}

                  {canProceed && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Botão de exclusão liberado. Clique para confirmar.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === "warning" && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              {impactItems.length > 0 ? (
                <Button variant="destructive" onClick={handleNext}>
                  Ver Impacto
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setStep("confirm")}>
                  Continuar
                </Button>
              )}
            </>
          )}

          {step === "impact" && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleNext}>
                Entendi, continuar
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!canProceed || isLoading}
                className={cn(
                  "gap-2 transition-all",
                  canProceed && "animate-pulse"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Excluir Permanentemente
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
