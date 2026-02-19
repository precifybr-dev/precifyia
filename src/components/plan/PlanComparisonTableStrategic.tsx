import { Check, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonRow {
  feature: string;
  tooltip?: string;
  free: string | boolean;
  essencial: string | boolean;
  pro: string | boolean;
}

const comparisonData: ComparisonRow[] = [
  { feature: "Fichas técnicas (receitas)", free: "Até 2", essencial: "Até 8", pro: "Ilimitadas" },
  { feature: "Insumos cadastrados", free: "Até 35", essencial: "Até 100", pro: "Ilimitados" },
  { feature: "Dashboard", free: "Básico", essencial: "Completo", pro: "Avançado + DRE" },
  {
    feature: "Análise de cardápio (IA)",
    tooltip: "Análise IA = geração automática de insights estratégicos com base nos seus custos e estrutura de cardápio.",
    free: "1 (uso total durante o período)",
    essencial: "Até 5 usos mensais",
    pro: "Até 10 usos mensais",
  },
  {
    feature: "Combos estratégicos (IA)",
    tooltip: "Análise IA = geração automática de insights estratégicos com base nos seus custos e estrutura de cardápio.",
    free: "1 (uso total durante o período)",
    essencial: "Até 3 usos mensais",
    pro: "Até 5 usos mensais",
  },
  { feature: "Importação iFood", free: "1 (uso total durante o período)", essencial: "Até 5 usos mensais", pro: "Ilimitada" },
  { feature: "Importação de planilha", free: "1 (uso total, até 35 insumos)", essencial: "Até 3 usos mensais", pro: "Ilimitada" },
  { feature: "Sub-receitas", free: false, essencial: "Incluso", pro: "Incluso" },
  { feature: "Exportação de dados", free: false, essencial: "Incluso", pro: "Incluso" },
  { feature: "Multi-loja", free: false, essencial: false, pro: "Até 3 lojas" },
  { feature: "Colaboradores", free: false, essencial: false, pro: "Incluso" },
  { feature: "Suporte", free: "Padrão", essencial: "Padrão", pro: "Via WhatsApp" },
];

function CellValue({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-4 h-4 text-primary mx-auto" />
    ) : (
      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return (
    <span className={`text-sm font-medium ${isPro ? "text-primary font-semibold" : "text-foreground"}`}>
      {value}
    </span>
  );
}

interface Props {
  currentPlan?: string;
}

export function PlanComparisonTable({ currentPlan }: Props) {
  const planOrder: Record<string, number> = { free: 0, basic: 1, pro: 2 };
  const currentIdx = planOrder[currentPlan || "free"] ?? 0;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-sm font-semibold text-muted-foreground p-3 border-b border-border sticky left-0 bg-muted/30 min-w-[160px]">
                Recurso
              </th>
              <th className="text-center p-3 border-b border-border min-w-[120px]">
                <span className="text-sm font-bold text-muted-foreground">Teste</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Operação inicial</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Grátis</p>
              </th>
              <th className="text-center p-3 border-b border-border min-w-[120px]">
                <span className="text-sm font-bold text-primary">Essencial</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Gestão organizada</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">R$ 97/mês</p>
              </th>
              <th className="text-center p-3 border-b border-border min-w-[120px] bg-primary/5 rounded-t-lg">
                <span className="text-sm font-bold text-primary">Pro ⭐</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Gestão estratégica com escala</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">R$ 147/mês</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                <td className="text-sm text-foreground p-3 border-b border-border/50 sticky left-0 bg-inherit font-medium">
                  <span className="flex items-center gap-1.5">
                    {row.feature}
                    {row.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs">
                          {row.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </span>
                </td>
                <td className="text-center p-3 border-b border-border/50">
                  <CellValue value={row.free} />
                </td>
                <td className="text-center p-3 border-b border-border/50">
                  <CellValue value={row.essencial} />
                </td>
                <td className="text-center p-3 border-b border-border/50 bg-primary/5">
                  <CellValue value={row.pro} isPro />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-3 text-center italic">
          * Todos os limites são por conta, independente do número de lojas cadastradas.
        </p>
      </div>
    </TooltipProvider>
  );
}
