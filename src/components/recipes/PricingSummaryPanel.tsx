import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  Calculator, 
  Tag, 
  Smartphone,
  Building2,
  AlertCircle,
  Wallet,
  Store,
  HelpCircle
} from "lucide-react";

interface PricingSummaryPanelProps {
  // Costs
  ingredientsCost: number;
  costWithLoss: number;
  productionCostsPercent: number | null;
  
  // CMV
  cmvTarget: string;
  setCmvTarget: (value: string) => void;
  actualCMV: number;
  defaultCmv?: number | null;
  
  // Selling Price
  sellingPrice: string;
  setSellingPrice: (value: string) => void;
  suggestedPrice: number;
  
  // Loss
  lossPercent: string;
  setLossPercent: (value: string) => void;
  
  // Margins
  grossMargin: number;
  grossMarginPercent: number;
  
  // iFood
  ifoodPrice: number;
  suggestedIfoodPrice: number;
  calculatedIfoodPrice: number; // Preço calculado pela fórmula
  localIfoodRate: string;
  setLocalIfoodRate: (value: string) => void;
  ifoodRealPercentage: number | null;
  
  // iFood Selling Price (optional override)
  ifoodSellingPrice: string;
  setIfoodSellingPrice: (value: string) => void;
  
  // Promotion
  discountPercent: string;
  setDiscountPercent: (value: string) => void;
  discountedPrice: number;
  
  // Business costs
  totalBusinessCostPercent: number | null;
  
  // Taxes (NEW - from business area configuration)
  taxPercentage?: number | null;
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
  totalBusinessCostPercent,
  taxPercentage,
}: PricingSummaryPanelProps) {
  const hasSellingPrice = sellingPrice.trim() !== "" && parseFloat(sellingPrice) > 0;
  const hasCmvTarget = cmvTarget.trim() !== "" && parseFloat(cmvTarget) > 0;
  const hasIfoodRate = localIfoodRate.trim() !== "" || ifoodRealPercentage !== null;
  const hasDiscount = discountPercent.trim() !== "" && parseFloat(discountPercent) > 0;
  const hasCustomIfoodPrice = ifoodSellingPrice.trim() !== "" && parseFloat(ifoodSellingPrice) > 0;

  // Effective iFood rate (local overrides global)
  const effectiveIfoodRate = parseFloat(localIfoodRate) || ifoodRealPercentage || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        Painel de Precificação
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Coluna Esquerda */}
        <div className="space-y-4">
          {/* Bloco 1: Preço de Venda */}
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

          {/* Bloco 2: Custos */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CUSTO RECEITA</p>
                  <p className="font-mono font-semibold text-foreground">
                    {formatCurrency(ingredientsCost)}
                  </p>
                </div>
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

          {/* Bloco 3: Margens */}
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

          {/* Bloco 4: Preços Sugeridos */}
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

          {/* Bloco 5: Promoção */}
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

          {/* Bloco 6: Custos de Produção (%) */}
          {productionCostsPercent !== null && productionCostsPercent > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">CUSTOS DE PRODUÇÃO (%)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        <p className="font-semibold mb-1">Como funciona esse percentual?</p>
                        <p>Esse valor representa quanto cada produto ajuda a pagar as contas mensais do seu negócio.</p>
                        <p className="mt-1">Aluguel, internet, energia, sistema e outras despesas são diluídas neste percentual para que cada venda pague apenas a sua parte justa.</p>
                        <p className="mt-1 text-amber-500 font-medium">⚠️ As despesas do negócio já estão consideradas aqui e não são abatidas novamente.</p>
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
              </CardContent>
            </Card>
          )}

          {/* Bloco informativo: Despesas do Negócio (somente referência) */}
          {totalBusinessCostPercent !== null && totalBusinessCostPercent > 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-sm font-medium text-muted-foreground/80">DESPESAS NEGÓCIO (ref.)</span>
                </div>
                <p className="font-mono text-lg font-bold text-muted-foreground">
                  {totalBusinessCostPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Informação gerencial — já incluída nos custos de produção acima
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Direita */}
        <div className="space-y-4">
          {/* Bloco CMV Unificado */}
          <Card className="border-primary/30">
            <CardContent className="pt-4 space-y-4">
              {/* CMV Praticado (calculado automaticamente - NÃO editável) */}
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

              {/* Separador */}
              <div className="border-t border-primary/20" />

              {/* CMV Desejado (editável) */}
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

          {/* Calculadora iFood */}
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

                {/* Preço Calculado (pela fórmula) */}
                <div className="flex justify-between items-center py-1 border-t border-destructive/20">
                  <span className="text-sm text-muted-foreground">Preço Calculado</span>
                  <span className="font-mono font-semibold text-muted-foreground">
                    {formatCurrency(calculatedIfoodPrice)}
                  </span>
                </div>

                {/* Preço de Venda iFood (opcional - sobrescreve o calculado) */}
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
        </div>
      </div>

      {/* ==================== LUCRO LÍQUIDO REAL ==================== */}
      {(() => {
        // Cálculos para Lucro Líquido - LOJA
        const effectivePrice = parseFloat(sellingPrice) || suggestedPrice;
        const productionCostValue = effectivePrice * (productionCostsPercent || 0) / 100;
        const taxValue = effectivePrice * (taxPercentage || 0) / 100;
        const netProfit = effectivePrice - costWithLoss - productionCostValue - taxValue;
        const netProfitPercent = effectivePrice > 0 ? (netProfit / effectivePrice) * 100 : 0;
        const costPercent = effectivePrice > 0 ? (costWithLoss / effectivePrice) * 100 : 0;
        const taxPercent = taxPercentage || 0;
        const productionPercent = productionCostsPercent || 0;

        // Cálculos para iFood
        const ifoodFeeValue = ifoodPrice * (effectiveIfoodRate / 100);
        const ifoodNetRevenue = ifoodPrice - ifoodFeeValue;
        const ifoodProductionCost = ifoodNetRevenue * (productionCostsPercent || 0) / 100;
        const ifoodTaxValue = ifoodNetRevenue * (taxPercentage || 0) / 100;
        const ifoodNetProfit = ifoodNetRevenue - costWithLoss - ifoodProductionCost - ifoodTaxValue;
        const ifoodNetProfitPercent = ifoodPrice > 0 ? (ifoodNetProfit / ifoodPrice) * 100 : 0;
        const ifoodCostPercent = ifoodPrice > 0 ? (costWithLoss / ifoodPrice) * 100 : 0;
        const ifoodProductionCostPercent = ifoodPrice > 0 ? (ifoodProductionCost / ifoodPrice) * 100 : 0;
        const ifoodTaxPercent = ifoodPrice > 0 ? (ifoodTaxValue / ifoodPrice) * 100 : 0;

        return (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Lucro Líquido Real - LOJA */}
            <Card className="border-success/30 bg-success/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-success" />
                  <span className="text-sm font-semibold">LUCRO LÍQUIDO REAL - LOJA</span>
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
                        <span className="text-xs text-muted-foreground">{productionPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  
                  
                  
                  {/* NEW: Taxes Line */}
                  {taxPercentage !== null && taxPercentage !== undefined && taxPercentage > 0 && (
                    <div className="flex justify-between items-center py-1 text-amber-600">
                      <span>(-) Impostos</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(taxValue)}</span>
                        <span className="text-xs text-muted-foreground">{taxPercent.toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-success/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1">
                        <Wallet className="w-4 h-4" />
                        = LUCRO LÍQUIDO
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
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Lucro real após custo direto, custos de produção (%) e impostos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lucro Líquido Real - IFOOD */}
            <Card className={`border-destructive/30 ${hasCustomIfoodPrice ? 'bg-warning/5' : 'bg-destructive/5'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-semibold">LUCRO LÍQUIDO REAL - IFOOD</span>
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
                        <span className="text-xs text-muted-foreground">{ifoodProductionCostPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  
                  
                  
                  {/* NEW: Taxes Line for iFood */}
                  {taxPercentage !== null && taxPercentage !== undefined && taxPercentage > 0 && (
                    <div className="flex justify-between items-center py-1 text-amber-600">
                      <span>(-) Impostos</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(ifoodTaxValue)}</span>
                        <span className="text-xs text-muted-foreground">{ifoodTaxPercent.toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-destructive/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1">
                        <Wallet className="w-4 h-4" />
                        = LUCRO LÍQUIDO
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
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Este é o valor real que sobra após todos os custos, despesas e impostos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
