import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, HelpCircle, Info, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PricingProductionCostCardProps {
  productionCostsPercent: number | null;
}

export default function PricingProductionCostCard({ productionCostsPercent }: PricingProductionCostCardProps) {
  if (productionCostsPercent === null || productionCostsPercent <= 0) return null;

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">CUSTOS DE PRODUÇÃO (%)</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-yellow-500/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] text-xs">
                <p className="font-semibold mb-1">Custos aplicados neste produto</p>
                <p>Este percentual é o impacto real deste produto para ajudar a pagar os custos de produção do mês.</p>
                <p className="mt-1">Ele pode ser diferente da média do negócio, pois cada produto contribui de forma diferente para o faturamento.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="font-mono text-xl font-bold text-foreground">
          {productionCostsPercent.toFixed(2)}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Custos de produção rateados sobre o faturamento
        </p>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
            <Info className="w-3.5 h-3.5" />
            <span>Normal que este valor seja diferente da média do negócio.</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-xs text-muted-foreground bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
            <p>A porcentagem cadastrada no negócio é uma média mensal.</p>
            <p className="mt-1">Aqui mostramos quanto este produto específico ajuda a pagar os custos do mês, considerando preço, taxas e participação nas vendas.</p>
          </CollapsibleContent>
        </Collapsible>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground cursor-help">
                <BookOpen className="w-3.5 h-3.5 text-yellow-500/70" />
                <span className="underline decoration-dotted">Importante saber</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] text-xs">
              <p className="font-semibold mb-1">Importante saber</p>
              <p>Os custos de produção não são pagos por um único produto, mas sim pelo faturamento total do mês.</p>
              <p className="mt-1">Cada item contribui com uma parte proporcional.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
