import { useState } from "react";
import { RefreshCw, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickPriceButtonProps {
  ingredientsCount: number;
  updatedCount: number;
  recipesAffectedCount: number;
  onClick: () => void;
}

export function QuickPriceButton({
  ingredientsCount,
  updatedCount,
  recipesAffectedCount,
  onClick,
}: QuickPriceButtonProps) {
  const hasUpdates = updatedCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-300",
        "active:scale-[0.97] hover:shadow-lg",
        hasUpdates
          ? "border-success/30 bg-success/5 hover:border-success/50"
          : "border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent hover:border-primary/40"
      )}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start gap-3 sm:gap-4">
        {/* Animated icon */}
        <div
          className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300",
            hasUpdates ? "bg-success/15" : "bg-primary/10"
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300",
              hasUpdates ? "text-success" : "text-primary",
              !hasUpdates && "animate-[spin_8s_linear_infinite]"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display font-bold text-sm sm:text-base text-foreground">
              Atualizar Preços
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold transition-colors duration-500",
                hasUpdates
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Package className="w-3 h-3" />
              {ingredientsCount}
            </span>
          </div>

          {hasUpdates ? (
            <p className="text-xs sm:text-sm text-success font-medium">
              ✅ {updatedCount} insumo{updatedCount > 1 ? "s" : ""} atualizado{updatedCount > 1 ? "s" : ""} 
              {recipesAffectedCount > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {recipesAffectedCount} ficha{recipesAffectedCount > 1 ? "s" : ""} recalculada{recipesAffectedCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Mantenha seus custos em dia e não perca dinheiro
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
