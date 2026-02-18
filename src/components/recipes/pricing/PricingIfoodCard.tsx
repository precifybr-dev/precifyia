import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone } from "lucide-react";

interface PricingIfoodCardProps {
  sellingPrice: string;
  suggestedPrice: number;
  calculatedIfoodPrice: number;
  ifoodPrice: number;
  localIfoodRate: string;
  setLocalIfoodRate: (value: string) => void;
  ifoodRealPercentage: number | null;
  ifoodSellingPrice: string;
  setIfoodSellingPrice: (value: string) => void;
  effectiveIfoodRate: number;
  formatCurrency: (value: number) => string;
}

export default function PricingIfoodCard({
  sellingPrice,
  suggestedPrice,
  calculatedIfoodPrice,
  ifoodPrice,
  localIfoodRate,
  setLocalIfoodRate,
  ifoodRealPercentage,
  ifoodSellingPrice,
  setIfoodSellingPrice,
  effectiveIfoodRate,
  formatCurrency,
}: PricingIfoodCardProps) {
  const hasIfoodRate = localIfoodRate.trim() !== "" || ifoodRealPercentage !== null;
  const hasCustomIfoodPrice = ifoodSellingPrice.trim() !== "" && parseFloat(ifoodSellingPrice) > 0;

  return (
    <Card className="border-destructive/30 dark:border-destructive/50 bg-card">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-destructive" />
          <span className="text-sm font-semibold">CALCULADORA PREÇO IFOOD</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-destructive/20">
            <span className="text-sm text-muted-foreground">Preço Base (Loja)</span>
            <span className="font-mono font-semibold">
              {formatCurrency(parseFloat(sellingPrice) || suggestedPrice)}
            </span>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              Taxa iFood
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                editável
              </Badge>
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="99"
                placeholder={ifoodRealPercentage?.toFixed(2) || "0"}
                value={localIfoodRate}
                onChange={(e) => setLocalIfoodRate(e.target.value)}
                className="pr-8 text-sm h-9 border-destructive/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            {!hasIfoodRate && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Configure na Área do Negócio
              </p>
            )}
            {ifoodRealPercentage && !localIfoodRate && (
              <p className="text-xs text-muted-foreground">
                Do perfil: {ifoodRealPercentage.toFixed(2)}%
              </p>
            )}
          </div>

          <div className="flex justify-between items-center py-1 border-t border-destructive/20">
            <span className="text-sm text-muted-foreground">Preço Calculado</span>
            <span className="font-mono font-semibold text-muted-foreground">
              {formatCurrency(calculatedIfoodPrice)}
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              Preço de Venda iFood
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                opcional
              </Badge>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={calculatedIfoodPrice.toFixed(2)}
                value={ifoodSellingPrice}
                onChange={(e) => setIfoodSellingPrice(e.target.value)}
                className="pl-10 text-sm h-9 border-warning/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {hasCustomIfoodPrice 
                ? "Usando preço personalizado" 
                : "Deixe vazio para usar o preço calculado"}
            </p>
          </div>

          <div className="pt-2 border-t border-destructive/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor Final iFood</span>
              <span className={`font-mono text-xl font-bold ${hasCustomIfoodPrice ? 'text-warning' : 'text-destructive'}`}>
                {formatCurrency(ifoodPrice)}
              </span>
            </div>
            {hasCustomIfoodPrice && parseFloat(ifoodSellingPrice) < calculatedIfoodPrice && (
              <p className="text-xs text-warning mt-1">
                ⚠ Preço menor que o calculado ({formatCurrency(calculatedIfoodPrice)})
              </p>
            )}
          </div>
        </div>

        {effectiveIfoodRate > 0 && !hasCustomIfoodPrice && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border border-destructive/20">
            <p className="font-medium mb-1 text-foreground">Fórmula:</p>
            <p className="font-mono">
              {formatCurrency(parseFloat(sellingPrice) || suggestedPrice)} ÷ (1 − {effectiveIfoodRate.toFixed(2)}%) = {formatCurrency(calculatedIfoodPrice)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
