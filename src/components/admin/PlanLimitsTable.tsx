import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings2,
  FileSpreadsheet,
  Store,
  Sparkles,
  Check,
  X,
  Crown,
} from "lucide-react";

interface PlanLimitsTableProps {
  freeUsers: number;
  basicUsers: number;
  proUsers: number;
}

interface PlanLimit {
  feature: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
  icon: React.ReactNode;
}

const planLimits: PlanLimit[] = [
  {
    feature: "Fichas Técnicas (Receitas)",
    free: "10",
    basic: "40",
    pro: "Ilimitado",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    feature: "Insumos",
    free: "80",
    basic: "200",
    pro: "Ilimitado",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    feature: "Lojas/Negócios",
    free: "1",
    basic: "1",
    pro: "3",
    icon: <Store className="h-4 w-4" />,
  },
  {
    feature: "Análise de Cardápio (IA)",
    free: "1 (total no período)",
    basic: "5/mês",
    pro: "15/mês",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    feature: "Combos Estratégicos (IA)",
    free: "1 (total no período)",
    basic: "3/mês",
    pro: "10/mês",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    feature: "Importação iFood",
    free: "1 (total no período)",
    basic: "5/mês",
    pro: "Ilimitada",
    icon: <Settings2 className="h-4 w-4" />,
  },
  {
    feature: "Importação de Planilha",
    free: "2 (total no período)",
    basic: "7/mês",
    pro: "Ilimitada",
    icon: <Settings2 className="h-4 w-4" />,
  },
  {
    feature: "Sub-receitas",
    free: "Até 3",
    basic: "Ilimitado",
    pro: "Ilimitado",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    feature: "Suporte",
    free: "Padrão",
    basic: "Padrão",
    pro: "Prioritário WhatsApp",
    icon: <Crown className="h-4 w-4" />,
  },
];

const formatCellValue = (value: string | boolean) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-success mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground mx-auto" />
    );
  }
  return <span className="font-medium">{value}</span>;
};

export function PlanLimitsTable({ freeUsers, basicUsers, proUsers }: PlanLimitsTableProps) {
  const totalUsers = freeUsers + basicUsers + proUsers;

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Controle de Planos e Limites
        </CardTitle>
        <CardDescription>
          Recursos e limitações por tipo de assinatura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Recurso</TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className="text-muted-foreground">
                    Free
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {freeUsers} usuário{freeUsers !== 1 ? "s" : ""}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    Básico
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {basicUsers} usuário{basicUsers !== 1 ? "s" : ""}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Pro
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {proUsers} usuário{proUsers !== 1 ? "s" : ""}
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planLimits.map((limit) => (
              <TableRow key={limit.feature}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{limit.icon}</span>
                    {limit.feature}
                  </div>
                </TableCell>
                <TableCell className="text-center">{formatCellValue(limit.free)}</TableCell>
                <TableCell className="text-center">{formatCellValue(limit.basic)}</TableCell>
                <TableCell className="text-center">{formatCellValue(limit.pro)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground mt-3 italic">
          * Limites de análise são por conta, não por loja.
        </p>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{freeUsers}</p>
            <p className="text-xs text-muted-foreground">Free</p>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? ((freeUsers / totalUsers) * 100).toFixed(0) : 0}%
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{basicUsers}</p>
            <p className="text-xs text-muted-foreground">Básico</p>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? ((basicUsers / totalUsers) * 100).toFixed(0) : 0}%
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <p className="text-2xl font-bold text-emerald-600">{proUsers}</p>
            <p className="text-xs text-muted-foreground">Pro</p>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
