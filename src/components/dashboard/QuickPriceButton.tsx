import { ShoppingCart, Package, Check } from "lucide-react";
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
        "w-full group relative overflow-hidden rounded-xl p-4 sm:p-5 text-left transition-all duration-300",
        "active:scale-[0.97] hover:shadow-lg",
        hasUpdates
          ? "bg-success text-success-foreground hover:brightness-110"
          : "bg-success text-success-foreground hover:brightness-110"
      )}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display font-bold text-sm sm:text-base">
              Atualizar Preços
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-white/20">
              <Package className="w-3 h-3" />
              {ingredientsCount}
            </span>
          </div>

          {hasUpdates ? (
            <p className="text-xs sm:text-sm opacity-90 font-medium">
              <span className="inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {updatedCount} insumo{updatedCount > 1 ? "s" : ""} atualizado{updatedCount > 1 ? "s" : ""}
              </span>
              {recipesAffectedCount > 0 && (
                <span className="opacity-75">
                  {" "}· {recipesAffectedCount} ficha{recipesAffectedCount > 1 ? "s" : ""} recalculada{recipesAffectedCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs sm:text-sm opacity-80">
              Mantenha seus custos em dia e não perca dinheiro
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
