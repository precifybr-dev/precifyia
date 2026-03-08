import { RefreshCw, Package, Check, ArrowRight } from "lucide-react";
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
        "w-full group relative overflow-hidden rounded-2xl text-left transition-all duration-300",
        "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "p-4 sm:p-5",
        hasUpdates
          ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25"
          : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
      )}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        {/* Icon */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          {hasUpdates ? (
            <Check className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : (
            <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-180 transition-transform duration-500" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-base sm:text-lg">
              {hasUpdates ? "Preços Atualizados ✓" : "Atualizar Preços"}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white/20 backdrop-blur-sm">
              <Package className="w-3 h-3" />
              {ingredientsCount}
            </span>
          </div>

          <p className="text-xs sm:text-sm opacity-90 leading-snug">
            {hasUpdates ? (
              <>
                {updatedCount} insumo{updatedCount > 1 ? "s" : ""} atualizado{updatedCount > 1 ? "s" : ""}
                {recipesAffectedCount > 0 && (
                  <span className="opacity-75">
                    {" · "}{recipesAffectedCount} ficha{recipesAffectedCount > 1 ? "s" : ""} recalculada{recipesAffectedCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : (
              "Mantenha seus custos em dia e não perca dinheiro"
            )}
          </p>
        </div>

        {/* Arrow */}
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors">
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}
