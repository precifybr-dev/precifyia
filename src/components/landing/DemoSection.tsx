import { useState, useMemo } from "react";
import { DollarSign, Percent, TrendingUp, Calculator, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function DemoSection() {
  const [cost, setCost] = useState<string>("12.00");
  const [salePrice, setSalePrice] = useState<string>("40.00");
  const [marketplaceTax, setMarketplaceTax] = useState<string>("27");

  const calculations = useMemo(() => {
    const costNum = parseFloat(cost) || 0;
    const salePriceNum = parseFloat(salePrice) || 0;
    const taxNum = parseFloat(marketplaceTax) || 0;

    const cmv = salePriceNum > 0 ? (costNum / salePriceNum) * 100 : 0;
    const margin = 100 - cmv;
    const marketplacePrice = taxNum < 100 ? salePriceNum / (1 - taxNum / 100) : 0;
    const profitDirect = salePriceNum - costNum;
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
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Teste agora — sem cadastro
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja quanto você realmente lucra
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Preencha com os dados de um produto e descubra se está lucrando ou perdendo dinheiro.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-6 py-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Simulador de Lucro</span>
            </div>

            <div className="p-6 lg:p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados do seu produto
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-medium">Custo do Produto (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input id="cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="pl-10 text-lg font-semibold" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-muted-foreground">Quanto você gasta para produzir</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salePrice" className="text-sm font-medium">Preço de Venda (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input id="salePrice" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="pl-10 text-lg font-semibold" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-muted-foreground">Quanto você cobra no balcão</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-sm font-medium">Taxa do iFood (%)</Label>
                    <div className="relative">
                      <Input id="tax" type="number" step="0.1" min="0" max="99" value={marketplaceTax} onChange={(e) => setMarketplaceTax(e.target.value)} className="pr-10 text-lg font-semibold" placeholder="27" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Seu resultado
                  </h3>

                  {/* CMV */}
                  <div className={`p-4 rounded-xl border-2 ${calculations.isHealthyCMV ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Percent className={`w-4 h-4 ${calculations.isHealthyCMV ? 'text-success' : 'text-warning'}`} />
                        <span className="text-sm font-medium text-muted-foreground">CMV</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${calculations.isHealthyCMV ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {calculations.isHealthyCMV ? 'Saudável' : 'Alto — cuidado'}
                      </span>
                    </div>
                    <p className={`text-3xl font-bold ${calculations.isHealthyCMV ? 'text-success' : 'text-warning'}`}>
                      {calculations.cmv}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Margem bruta: {calculations.margin}%</p>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="text-xs text-muted-foreground mb-1">Balcão</div>
                      <p className="text-2xl font-bold text-primary">R$ {formatCurrency(salePrice)}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-success">
                        <TrendingUp className="w-3 h-3" />
                        Lucro: R$ {formatCurrency(calculations.profitDirect)}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                      <div className="text-xs text-muted-foreground mb-1">iFood</div>
                      <p className="text-2xl font-bold text-success">R$ {formatCurrency(calculations.marketplacePrice)}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        Mesma margem líquida
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Por que R$ {formatCurrency(calculations.marketplacePrice)} no iFood?</span>
                      <br />
                      Para manter a mesma margem após a taxa de {marketplaceTax}%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA below calculator */}
          <div className="text-center mt-10">
            <p className="text-lg font-semibold text-foreground mb-2">
              Quer calcular todos os seus produtos?
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Cadastre seus insumos e veja o lucro real de cada receita.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group">
                Começar grátis agora
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
