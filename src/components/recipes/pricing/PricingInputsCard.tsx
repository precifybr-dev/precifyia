import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle } from "lucide-react";

interface PricingInputsCardProps {
  sellingPrice: string;
  setSellingPrice: (value: string) => void;
  suggestedPrice: number;
  ingredientsCost: number;
  costWithLoss: number;
  productionCostsPercent: number | null;
  lossPercent: string;
  setLossPercent: (value: string) => void;
  formatCurrency: (value: number) => string;
  packagingCost?: number;
}

export default function PricingInputsCard({
  sellingPrice,
  setSellingPrice,
  suggestedPrice,
  ingredientsCost,
  costWithLoss,
  productionCostsPercent,
  lossPercent,
  setLossPercent,
  formatCurrency,
  packagingCost = 0,
}: PricingInputsCardProps) {
  const hasSellingPrice = sellingPrice.trim() !== "" && parseFloat(sellingPrice) > 0;

  return (
    <>
      {/* Preço de Venda */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              PREÇO DE VENDA
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                editável
              </Badge>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={suggestedPrice.toFixed(2)}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="pl-10 text-lg font-bold border-2 border-primary/30"
              />
            </div>
            {!hasSellingPrice && (
              <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Informe o preço de venda
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custos */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className={`grid ${packagingCost > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            <div>
              <p className="text-xs text-muted-foreground mb-1">CUSTO RECEITA</p>
              <p className="font-mono font-semibold text-foreground">
                {formatCurrency(ingredientsCost)}
              </p>
            </div>
            {packagingCost > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">C/ EMBALAGEM</p>
                <p className="font-mono font-semibold text-primary">
                  {formatCurrency(ingredientsCost)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  (emb: {formatCurrency(packagingCost)})
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-muted-foreground">CUSTO C/ PERDA</p>
              </div>
              <p className="font-mono font-semibold text-foreground">
                {formatCurrency(costWithLoss)}
              </p>
            </div>
          </div>
          {productionCostsPercent !== null && productionCostsPercent > 0 && (
            <p className="text-xs text-muted-foreground">
              Custos de produção: {productionCostsPercent.toFixed(2)}% do faturamento
            </p>
          )}
          
          {/* % Perda */}
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground mb-1 block">% PERDA (opcional)</Label>
            <div className="relative w-24">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={lossPercent}
                onChange={(e) => setLossPercent(e.target.value)}
                className="h-8 pr-6 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
