import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import type { RecipePricingResult } from "@/hooks/useRecipePricing";
import PricingInputsCard from "./pricing/PricingInputsCard";
import PricingMarginsCard from "./pricing/PricingMarginsCard";
import PricingIfoodCard from "./pricing/PricingIfoodCard";
import PricingPromotionCard from "./pricing/PricingPromotionCard";
import PricingProductionCostCard from "./pricing/PricingProductionCostCard";
import PricingProfitCard from "./pricing/PricingProfitCard";

interface PricingSummaryPanelProps {
  ingredientsCost: number;
  costWithLoss: number;
  productionCostsPercent: number | null;
  cmvTarget: string;
  setCmvTarget: (value: string) => void;
  actualCMV: number;
  defaultCmv?: number | null;
  sellingPrice: string;
  setSellingPrice: (value: string) => void;
  suggestedPrice: number;
  lossPercent: string;
  setLossPercent: (value: string) => void;
  grossMargin: number;
  grossMarginPercent: number;
  ifoodPrice: number;
  suggestedIfoodPrice: number;
  calculatedIfoodPrice: number;
  localIfoodRate: string;
  setLocalIfoodRate: (value: string) => void;
  ifoodRealPercentage: number | null;
  ifoodSellingPrice: string;
  setIfoodSellingPrice: (value: string) => void;
  discountPercent: string;
  setDiscountPercent: (value: string) => void;
  discountedPrice: number;
  taxPercentage?: number | null;
  isCalculating?: boolean;
  calculationError?: string | null;
  pricingResult?: RecipePricingResult | null;
  packagingCost?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function PricingSummaryPanel({
  ingredientsCost,
  costWithLoss,
  productionCostsPercent,
  cmvTarget,
  setCmvTarget,
  actualCMV,
  defaultCmv,
  sellingPrice,
  setSellingPrice,
  suggestedPrice,
  lossPercent,
  setLossPercent,
  grossMargin,
  grossMarginPercent,
  ifoodPrice,
  suggestedIfoodPrice,
  calculatedIfoodPrice,
  localIfoodRate,
  setLocalIfoodRate,
  ifoodRealPercentage,
  ifoodSellingPrice,
  setIfoodSellingPrice,
  discountPercent,
  setDiscountPercent,
  discountedPrice,
  taxPercentage,
  isCalculating = false,
  calculationError = null,
  pricingResult = null,
  packagingCost = 0,
}: PricingSummaryPanelProps) {
  const effectiveIfoodRate = parseFloat(localIfoodRate) || ifoodRealPercentage || 0;
  const hasCustomIfoodPrice = ifoodSellingPrice.trim() !== "" && parseFloat(ifoodSellingPrice) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Painel de Precificação
        </h3>
        {isCalculating && (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 animate-pulse gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Calculando...
          </Badge>
        )}
      </div>

      {/* Calculation Error */}
      {calculationError && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">Erro no cálculo</p>
            <p className="text-sm text-destructive/80">{calculationError}</p>
          </div>
        </div>
      )}

      {/* Warnings from backend */}
      {pricingResult?.warnings && pricingResult.warnings.length > 0 && (
        <div className="space-y-2">
          {pricingResult.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning">{warning}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <PricingInputsCard
            sellingPrice={sellingPrice}
            setSellingPrice={setSellingPrice}
            suggestedPrice={suggestedPrice}
            ingredientsCost={ingredientsCost}
            costWithLoss={costWithLoss}
            productionCostsPercent={productionCostsPercent}
            lossPercent={lossPercent}
            setLossPercent={setLossPercent}
            formatCurrency={formatCurrency}
            packagingCost={packagingCost}
          />

          <PricingPromotionCard
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            discountedPrice={discountedPrice}
            formatCurrency={formatCurrency}
          />

          <PricingProductionCostCard productionCostsPercent={productionCostsPercent} />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <PricingMarginsCard
            grossMargin={grossMargin}
            grossMarginPercent={grossMarginPercent}
            suggestedPrice={suggestedPrice}
            suggestedIfoodPrice={suggestedIfoodPrice}
            cmvTarget={cmvTarget}
            setCmvTarget={setCmvTarget}
            actualCMV={actualCMV}
            defaultCmv={defaultCmv}
            formatCurrency={formatCurrency}
          />

          <PricingIfoodCard
            sellingPrice={sellingPrice}
            suggestedPrice={suggestedPrice}
            calculatedIfoodPrice={calculatedIfoodPrice}
            ifoodPrice={ifoodPrice}
            localIfoodRate={localIfoodRate}
            setLocalIfoodRate={setLocalIfoodRate}
            ifoodRealPercentage={ifoodRealPercentage}
            ifoodSellingPrice={ifoodSellingPrice}
            setIfoodSellingPrice={setIfoodSellingPrice}
            effectiveIfoodRate={effectiveIfoodRate}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>

      {/* Profit Cards */}
      <PricingProfitCard
        sellingPrice={sellingPrice}
        suggestedPrice={suggestedPrice}
        costWithLoss={costWithLoss}
        productionCostsPercent={productionCostsPercent}
        taxPercentage={taxPercentage}
        ifoodPrice={ifoodPrice}
        effectiveIfoodRate={effectiveIfoodRate}
        hasCustomIfoodPrice={hasCustomIfoodPrice}
        pricingResult={pricingResult}
        formatCurrency={formatCurrency}
      />

      {/* Final note */}
      <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5">
        <Calculator className="w-3.5 h-3.5" />
        📊 Este cálculo segue a lógica real de como os custos são pagos no fim do mês.
      </p>
    </div>
  );
}
