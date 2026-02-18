import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

interface PricingPromotionCardProps {
  discountPercent: string;
  setDiscountPercent: (value: string) => void;
  discountedPrice: number;
  formatCurrency: (value: number) => string;
}

export default function PricingPromotionCard({
  discountPercent,
  setDiscountPercent,
  discountedPrice,
  formatCurrency,
}: PricingPromotionCardProps) {
  const hasDiscount = discountPercent.trim() !== "" && parseFloat(discountPercent) > 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">PROMOÇÃO</span>
          <Badge variant="outline" className="text-xs">editável</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">% DESCONTO</Label>
            <div className="relative">
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="h-8 pr-6 text-sm border-2 border-warning/30"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
            </div>
            {!hasDiscount && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Defina o desconto
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">PREÇO C/ DESC</p>
            <p className="font-mono font-bold text-warning">
              {formatCurrency(discountedPrice)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
