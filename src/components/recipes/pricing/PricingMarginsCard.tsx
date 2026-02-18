import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Percent, AlertCircle, HelpCircle } from "lucide-react";

interface PricingMarginsCardProps {
  grossMargin: number;
  grossMarginPercent: number;
  suggestedPrice: number;
  suggestedIfoodPrice: number;
  cmvTarget: string;
  setCmvTarget: (value: string) => void;
  actualCMV: number;
  defaultCmv?: number | null;
  formatCurrency: (value: number) => string;
}

export default function PricingMarginsCard({
  grossMargin,
  grossMarginPercent,
  suggestedPrice,
  suggestedIfoodPrice,
  cmvTarget,
  setCmvTarget,
  actualCMV,
  defaultCmv,
  formatCurrency,
}: PricingMarginsCardProps) {
  const hasCmvTarget = cmvTarget.trim() !== "" && parseFloat(cmvTarget) > 0;

  return (
    <>
      {/* Margens */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">MARGENS</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">MARGEM APROX %</p>
              <p className={`font-mono text-lg font-bold ${grossMarginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {grossMarginPercent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">MARGEM APROX R$</p>
              <p className={`font-mono text-lg font-bold ${grossMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(grossMargin)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preços Sugeridos */}
      <Card className="bg-success/5 border-success/30">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">PREÇO SUGERIDO</p>
              <p className="font-mono text-xl font-bold text-success">
                {formatCurrency(suggestedPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">PREÇO IFOOD</p>
              <p className="font-mono text-xl font-bold text-red-600">
                {formatCurrency(suggestedIfoodPrice)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CMV Unificado */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 space-y-4">
          {/* CMV Praticado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground font-medium">CMV PRATICADO</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p><strong>CMV</strong> = Custo da Mercadoria Vendida</p>
                      <p className="mt-1">Indica quanto do preço de venda é consumido pelo custo do produto.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted">
                automático
              </Badge>
            </div>
            <p className={`font-mono text-2xl font-bold ${actualCMV <= (parseFloat(cmvTarget) || 30) ? 'text-success' : 'text-warning'}`}>
              {actualCMV.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Custo ÷ Preço de Venda
            </p>
            {parseFloat(cmvTarget) > 0 && (
              <p className={`text-xs mt-1 ${actualCMV <= parseFloat(cmvTarget) ? 'text-success' : 'text-warning'}`}>
                {actualCMV <= parseFloat(cmvTarget) 
                  ? '✓ Dentro da meta' 
                  : `⚠ ${(actualCMV - parseFloat(cmvTarget)).toFixed(1)}% acima da meta`}
              </p>
            )}
          </div>

          <div className="border-t border-primary/20" />

          {/* CMV Desejado */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              CMV DESEJADO
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                editável
              </Badge>
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="1"
                min="1"
                max="99"
                value={cmvTarget}
                onChange={(e) => setCmvTarget(e.target.value)}
                className="pr-8 text-lg font-bold border-2 border-primary/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            {!hasCmvTarget && (
              <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Defina o CMV desejado
              </p>
            )}
            {defaultCmv && (
              <p className="text-xs text-muted-foreground">
                Padrão do negócio: {defaultCmv}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
