import { useState, useMemo } from "react";
import { DollarSign, Percent, TrendingUp, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DemoSection() {
  const [cost, setCost] = useState<string>("12.00");
  const [salePrice, setSalePrice] = useState<string>("40.00");
  const [marketplaceTax, setMarketplaceTax] = useState<string>("27");

  const calculations = useMemo(() => {
    const costNum = parseFloat(cost) || 0;
    const salePriceNum = parseFloat(salePrice) || 0;
    const taxNum = parseFloat(marketplaceTax) || 0;

    // CMV = (Custo / Preço de Venda) * 100
    const cmv = salePriceNum > 0 ? (costNum / salePriceNum) * 100 : 0;

    // Margem = 100 - CMV
    const margin = 100 - cmv;

    // Preço Marketplace = Preço Venda / (1 - Taxa/100)
    const marketplacePrice = taxNum < 100 ? salePriceNum / (1 - taxNum / 100) : 0;

    // Lucro no balcão
    const profitDirect = salePriceNum - costNum;

    // Lucro no marketplace (após taxa)
    const profitMarketplace = marketplacePrice - costNum - (marketplacePrice * taxNum / 100);

    return {
      cmv: cmv.toFixed(1),
      margin: margin.toFixed(1),
      marketplacePrice: marketplacePrice.toFixed(2),
      profitDirect: profitDirect.toFixed(2),
      profitMarketplace: profitMarketplace.toFixed(2),
      isHealthyCMV: cmv <= 35,
      isValidPrice: salePriceNum > costNum,
    };
  }, [cost, salePrice, marketplaceTax]);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0,00" : num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <section id="calculadora" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Calculadora gratuita
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja na prática
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Preencha com os dados do seu produto e veja instantaneamente os dois preços
          </p>
        </div>

        {/* Calculator */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
            {/* Header bar */}
            <div className="bg-muted/50 border-b border-border px-6 py-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Simulador de Precificação</span>
            </div>

            <div className="p-6 lg:p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados do seu produto
                  </h3>

                  {/* Cost Input */}
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-medium">
                      Custo do Produto (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="pl-10 text-lg font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quanto você gasta para produzir este item
                    </p>
                  </div>

                  {/* Sale Price Input */}
                  <div className="space-y-2">
                    <Label htmlFor="salePrice" className="text-sm font-medium">
                      Preço de Venda Direta (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="salePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="pl-10 text-lg font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quanto você cobra no balcão ou delivery próprio
                    </p>
                  </div>

                  {/* Marketplace Tax Input */}
                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-sm font-medium">
                      Taxa do Marketplace (%)
                    </Label>
                    <div className="relative">
                      <Input
                        id="tax"
                        type="number"
                        step="0.1"
                        min="0"
                        max="99"
                        value={marketplaceTax}
                        onChange={(e) => setMarketplaceTax(e.target.value)}
                        className="pr-10 text-lg font-semibold"
                        placeholder="27"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taxa cobrada pelo iFood, Rappi, etc.
                    </p>
                  </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Resultado automático
                  </h3>

                  {/* CMV Card */}
                  <div className={`p-4 rounded-xl border-2 ${calculations.isHealthyCMV ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Percent className={`w-4 h-4 ${calculations.isHealthyCMV ? 'text-success' : 'text-warning'}`} />
                        <span className="text-sm font-medium text-muted-foreground">CMV Praticado</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${calculations.isHealthyCMV ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {calculations.isHealthyCMV ? 'Saudável' : 'Alto'}
                      </span>
                    </div>
                    <p className={`text-3xl font-bold ${calculations.isHealthyCMV ? 'text-success' : 'text-warning'}`}>
                      {calculations.cmv}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Margem bruta: {calculations.margin}%
                    </p>
                  </div>

                  {/* Prices Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Direct Sale */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="text-xs text-muted-foreground mb-1">Venda Direta</div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {formatCurrency(salePrice)}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-success">
                        <TrendingUp className="w-3 h-3" />
                        Lucro: R$ {formatCurrency(calculations.profitDirect)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                        Preço para balcão, WhatsApp ou delivery próprio
                      </p>
                    </div>

                    {/* Marketplace */}
                    <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                      <div className="text-xs text-muted-foreground mb-1">Preço Marketplace</div>
                      <p className="text-2xl font-bold text-success">
                        R$ {formatCurrency(calculations.marketplacePrice)}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        Mesma margem líquida
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                        Maior porque inclui taxas e comissões do app
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Por que {formatCurrency(calculations.marketplacePrice)}?</span>
                      <br />
                      Para manter a mesma margem após a taxa de {marketplaceTax}%, o preço precisa ser ajustado automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting text */}
          <div className="text-center mt-8">
            <p className="text-xl font-semibold text-foreground">
              O mesmo produto.{" "}
              <span className="text-primary">Dois preços corretos.</span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Cada canal tem suas taxas. O sistema faz a conta por você.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
