import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Smartphone, AlertCircle } from "lucide-react";

interface IfoodPriceCalculatorProps {
  basePrice: number;
  ifoodRealPercentage: number | null;
}

export default function IfoodPriceCalculator({ basePrice, ifoodRealPercentage }: IfoodPriceCalculatorProps) {
  // Calculate final iFood price using formula: Price / (1 - percentage/100)
  const calculateIfoodPrice = (): number | null => {
    if (ifoodRealPercentage === null || ifoodRealPercentage <= 0) {
      return null;
    }

    // Prevent division by zero or negative results
    if (ifoodRealPercentage >= 100) {
      return null;
    }

    const divisor = 1 - (ifoodRealPercentage / 100);
    const finalPrice = basePrice / divisor;

    return Math.round(finalPrice * 100) / 100;
  };

  const ifoodPrice = calculateIfoodPrice();
  const priceIncrease = ifoodPrice !== null ? ifoodPrice - basePrice : null;
  const increasePercent = ifoodPrice !== null && basePrice > 0 
    ? ((ifoodPrice - basePrice) / basePrice) * 100 
    : null;

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const hasIfoodConfig = ifoodRealPercentage !== null && ifoodRealPercentage > 0;

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-5 w-5 text-red-600" />
          Calculadora Preço iFood
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasIfoodConfig ? (
          <div className="space-y-3">
            {/* Spreadsheet-style table */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-100/50">
                    <TableHead className="font-semibold text-foreground">Campo</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Preço Base</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(basePrice)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        Porcentagem Real iFood
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                          automático
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ifoodRealPercentage?.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-red-600 text-white hover:bg-red-600">
                    <TableCell className="font-bold">Preço Final iFood</TableCell>
                    <TableCell className="text-right font-mono text-xl font-bold">
                      {formatCurrency(ifoodPrice)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Additional info */}
            {priceIncrease !== null && increasePercent !== null && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-white/50 rounded border border-red-100">
                  <p className="text-xs text-muted-foreground">Acréscimo</p>
                  <p className="font-semibold text-red-700">{formatCurrency(priceIncrease)}</p>
                </div>
                <div className="p-2 bg-white/50 rounded border border-red-100">
                  <p className="text-xs text-muted-foreground">Aumento</p>
                  <p className="font-semibold text-red-700">+{increasePercent.toFixed(1)}%</p>
                </div>
              </div>
            )}

            {/* Formula explanation */}
            <div className="text-xs text-muted-foreground p-2 bg-white/30 rounded border border-red-100">
              <p className="font-medium mb-1">Fórmula aplicada:</p>
              <p className="font-mono">Preço iFood = Preço Base ÷ (1 − {ifoodRealPercentage?.toFixed(2)}%)</p>
              <p className="font-mono mt-1">{formatCurrency(basePrice)} ÷ {(1 - (ifoodRealPercentage || 0) / 100).toFixed(4)} = {formatCurrency(ifoodPrice)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Configure o Plano iFood na Área do Negócio
            </p>
            <p className="text-xs text-muted-foreground">
              A porcentagem real será calculada automaticamente e aplicada aqui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
