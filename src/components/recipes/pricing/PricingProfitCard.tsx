import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Store, Smartphone, Wallet, HelpCircle, Info } from "lucide-react";
import type { RecipePricingResult } from "@/hooks/useRecipePricing";

interface PricingProfitCardProps {
  sellingPrice: string;
  suggestedPrice: number;
  costWithLoss: number;
  productionCostsPercent: number | null;
  taxPercentage?: number | null;
  ifoodPrice: number;
  effectiveIfoodRate: number;
  hasCustomIfoodPrice: boolean;
  pricingResult?: RecipePricingResult | null;
  formatCurrency: (value: number) => string;
}

export default function PricingProfitCard({
  sellingPrice,
  suggestedPrice,
  costWithLoss,
  productionCostsPercent,
  taxPercentage,
  ifoodPrice,
  effectiveIfoodRate,
  hasCustomIfoodPrice,
  pricingResult,
  formatCurrency,
}: PricingProfitCardProps) {
  const effectivePrice = pricingResult?.final_selling_price ?? (parseFloat(sellingPrice) || suggestedPrice);
  const productionCostValue = pricingResult?.production_cost_value_loja ?? (effectivePrice * (productionCostsPercent || 0) / 100);
  const taxValue = pricingResult?.tax_value_loja ?? (effectivePrice * (taxPercentage || 0) / 100);
  const cardFeeValue = pricingResult?.card_fee_value_loja ?? 0;
  const cardFeePercent = pricingResult?.average_card_fee ?? 0;
  const netProfit = pricingResult?.net_profit_loja ?? (effectivePrice - costWithLoss - productionCostValue - taxValue - cardFeeValue);
  const netProfitPercent = pricingResult?.net_profit_loja_percent ?? (effectivePrice > 0 ? (netProfit / effectivePrice) * 100 : 0);
  const costPercent = effectivePrice > 0 ? (costWithLoss / effectivePrice) * 100 : 0;
  const taxPercent = pricingResult?.tax_percentage ?? (taxPercentage || 0);
  const productionPercent = pricingResult?.production_costs_percent ?? (productionCostsPercent || 0);

  // iFood values
  const ifoodFeeValue = pricingResult?.ifood_fee_value ?? (ifoodPrice * (effectiveIfoodRate / 100));
  const ifoodNetRevenue = pricingResult?.ifood_net_revenue ?? (ifoodPrice - ifoodFeeValue);
  const ifoodProductionCost = pricingResult?.ifood_production_cost ?? (ifoodNetRevenue * (productionCostsPercent || 0) / 100);
  const ifoodTaxValue = pricingResult?.ifood_tax_value ?? (ifoodNetRevenue * (taxPercentage || 0) / 100);
  const ifoodNetProfit = pricingResult?.net_profit_ifood ?? (ifoodNetRevenue - costWithLoss - ifoodProductionCost - ifoodTaxValue);
  const ifoodNetProfitPercent = pricingResult?.net_profit_ifood_percent ?? (ifoodPrice > 0 ? (ifoodNetProfit / ifoodPrice) * 100 : 0);
  const ifoodCostPercent = ifoodPrice > 0 ? (costWithLoss / ifoodPrice) * 100 : 0;
  const ifoodProductionCostPercent = ifoodPrice > 0 ? (ifoodProductionCost / ifoodPrice) * 100 : 0;
  const ifoodTaxPercent = ifoodPrice > 0 ? (ifoodTaxValue / ifoodPrice) * 100 : 0;

  return (
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      {/* LOJA */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-success" />
            <span className="text-sm font-semibold">LUCRO POR PRODUTO - LOJA</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Preço de Venda</span>
              <span className="font-mono font-semibold">{formatCurrency(effectivePrice)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1 text-destructive/80">
              <span>(-) Custo c/ Perda</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatCurrency(costWithLoss)}</span>
                <span className="text-xs text-muted-foreground">{costPercent.toFixed(0)}%</span>
              </div>
            </div>
            
            {productionCostsPercent !== null && productionCostsPercent > 0 && (
              <div className="flex justify-between items-center py-1 text-blue-600">
                <span>(-) Custos Produção</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCurrency(productionCostValue)}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help">{productionPercent.toFixed(1)}%</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px] text-xs">
                        <p className="font-semibold mb-1">Custos aplicados neste produto</p>
                        <p>Este percentual é o impacto real deste produto para ajudar a pagar os custos de produção do mês.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            
            {taxPercentage !== null && taxPercentage !== undefined && taxPercentage > 0 && (
              <div className="flex justify-between items-center py-1 text-amber-600">
                <span>(-) Impostos</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCurrency(taxValue)}</span>
                  <span className="text-xs text-muted-foreground">{taxPercent.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {cardFeePercent > 0 && (
              <div className="flex justify-between items-center py-1 text-violet-600">
                <span>(-) Taxa Cartão</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCurrency(cardFeeValue)}</span>
                  <span className="text-xs text-muted-foreground">{cardFeePercent.toFixed(1)}%</span>
                </div>
              </div>
            )}
            
            <div className="border-t border-success/30 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  = LUCRO POR PRODUTO
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                  <span className={`text-sm font-semibold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {netProfitPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground mt-2 italic cursor-help flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      Como o lucro é calculado
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] text-xs">
                    <p className="font-semibold mb-1">Como o lucro é calculado</p>
                    <p>O lucro líquido mostrado aqui já considera:</p>
                    <ul className="list-disc pl-3 mt-1 space-y-0.5">
                      <li>Custos de produção rateados</li>
                      <li>Impostos sobre a venda</li>
                      <li>Taxas de cartão (média cadastrada)</li>
                    </ul>
                    <p className="mt-1">As despesas do negócio são abatidas apenas do faturamento mensal, não por produto.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IFOOD */}
      <Card className={`border-destructive/30 ${hasCustomIfoodPrice ? 'bg-warning/5' : 'bg-destructive/5'}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold">LUCRO POR PRODUTO - IFOOD</span>
            {hasCustomIfoodPrice && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                preço personalizado
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Preço iFood</span>
              <span className={`font-mono font-semibold ${hasCustomIfoodPrice ? 'text-warning' : ''}`}>
                {formatCurrency(ifoodPrice)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-1 text-destructive/80">
              <span>(-) Taxa iFood</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatCurrency(ifoodFeeValue)}</span>
                <span className="text-xs text-muted-foreground">{effectiveIfoodRate.toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-1 text-destructive/80">
              <span>(-) Custo c/ Perda</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatCurrency(costWithLoss)}</span>
                <span className="text-xs text-muted-foreground">{ifoodCostPercent.toFixed(0)}%</span>
              </div>
            </div>
            
            {productionCostsPercent !== null && productionCostsPercent > 0 && (
              <div className="flex justify-between items-center py-1 text-blue-600">
                <span>(-) Custos Produção</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCurrency(ifoodProductionCost)}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help">{ifoodProductionCostPercent.toFixed(1)}%</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px] text-xs">
                        <p className="font-semibold mb-1">Custos aplicados neste produto</p>
                        <p>Este percentual é o impacto real deste produto para ajudar a pagar os custos de produção do mês.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            
            {taxPercentage !== null && taxPercentage !== undefined && taxPercentage > 0 && (
              <div className="flex justify-between items-center py-1 text-amber-600">
                <span>(-) Impostos</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCurrency(ifoodTaxValue)}</span>
                  <span className="text-xs text-muted-foreground">{ifoodTaxPercent.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {cardFeePercent > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-between items-center py-1 text-violet-400/60 cursor-help">
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Taxa Cartão
                      </span>
                      <span className="text-xs italic">já inclusa na taxa iFood</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs">
                    <p>A taxa de cartão (3,2%) já está embutida na taxa real do iFood, por isso não é descontada novamente aqui.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <div className="border-t border-destructive/30 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  = LUCRO POR PRODUTO
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-bold ${ifoodNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(ifoodNetProfit)}
                  </span>
                  <span className={`text-sm font-semibold ${ifoodNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {ifoodNetProfitPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground mt-2 italic cursor-help flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      Como o lucro é calculado
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] text-xs">
                    <p className="font-semibold mb-1">Como o lucro é calculado</p>
                    <p>O lucro líquido mostrado aqui já considera:</p>
                    <ul className="list-disc pl-3 mt-1 space-y-0.5">
                      <li>Custos de produção rateados</li>
                      <li>Taxas (iFood, cartões, impostos)</li>
                    </ul>
                    <p className="mt-1">As despesas do negócio são abatidas apenas do faturamento mensal, não por produto.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
