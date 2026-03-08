import { RefreshCw, Package, Check, ChevronRight } from "lucide-react";
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
        "w-full group relative rounded-xl border transition-all duration-200",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "p-3.5 sm:p-4",
        hasUpdates
          ? "bg-success/10 border-success/20 hover:bg-success/15"
          : "bg-card border-border hover:border-primary/40 hover:bg-primary/5 shadow-card hover:shadow-card-hover"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            hasUpdates
              ? "bg-success/15 text-success"
              : "bg-primary/10 text-primary"
          )}
        >
          {hasUpdates ? (
            <Check className="w-5 h-5" />
          ) : (
            <RefreshCw className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-semibold text-sm",
                hasUpdates ? "text-success" : "text-foreground"
              )}
            >
              {hasUpdates ? "Preços atualizados" : "Atualizar Preços"}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                hasUpdates
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Package className="w-2.5 h-2.5" />
              {ingredientsCount}
            </span>
          </div>

          <p
            className={cn(
              "text-xs mt-0.5 leading-snug",
              hasUpdates ? "text-success/80" : "text-muted-foreground"
            )}
          >
            {hasUpdates ? (
              <>
                {updatedCount} insumo{updatedCount > 1 ? "s" : ""} atualizado{updatedCount > 1 ? "s" : ""}
                {recipesAffectedCount > 0 && (
                  <span className="opacity-70">
                    {" · "}{recipesAffectedCount} ficha{recipesAffectedCount > 1 ? "s" : ""} recalculada{recipesAffectedCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : (
              "Mantenha seus custos em dia"
            )}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5",
            hasUpdates ? "text-success/60" : "text-muted-foreground/50"
          )}
        />
      </div>
    </button>
  );
}
