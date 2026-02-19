import { Check, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonRow {
  feature: string;
  tooltip?: string;
  free: string | boolean;
  essencial: string | boolean;
  pro: string | boolean;
}

const AI_TOOLTIP = "Análise IA = geração automática de insights estratégicos com base nos seus custos, cardápio e estrutura operacional.";

const comparisonData: ComparisonRow[] = [
  { feature: "Fichas técnicas (receitas)", free: "Até 10", essencial: "Até 40", pro: "Ilimitadas" },
  { feature: "Insumos cadastrados", free: "Até 80", essencial: "Até 200", pro: "Ilimitados" },
  { feature: "Dashboard", free: "Básico", essencial: "Completo", pro: "Avançado + DRE" },
  { feature: "Análise de cardápio (IA)", tooltip: AI_TOOLTIP, free: "1 (uso total durante o período)", essencial: "Até 5 usos mensais", pro: "Até 15 usos mensais" },
  { feature: "Combos estratégicos (IA)", tooltip: AI_TOOLTIP, free: "1 (uso total durante o período)", essencial: "Até 3 usos mensais", pro: "Até 10 usos mensais" },
  { feature: "Importação iFood", free: "1 (uso total durante o período)", essencial: "Até 5 usos mensais", pro: "Ilimitada" },
  { feature: "Importação de planilha", free: "1 (uso total durante o período)", essencial: "Até 3 usos mensais", pro: "Ilimitada" },
  { feature: "Sub-receitas", free: "Indisponível", essencial: "Incluso", pro: "Incluso" },
  { feature: "Exportação de dados", free: "Indisponível", essencial: "Incluso", pro: "Incluso" },
  { feature: "Multi-loja", free: "1 loja", essencial: "1 loja", pro: "Até 3 lojas" },
  { feature: "Colaboradores", free: "Indisponível", essencial: "Indisponível", pro: "Ilimitados" },
  { feature: "Suporte", free: "Padrão", essencial: "Padrão", pro: "Prioritário via WhatsApp" },
];

function CellValue({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-4 h-4 text-primary mx-auto" />
    ) : (
      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
    );
  }
  if (value === "Indisponível") {
    return <span className="text-sm text-muted-foreground/50">{value}</span>;
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
  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-sm font-semibold text-muted-foreground p-3 border-b border-border sticky left-0 bg-muted/30 min-w-[160px]">
                Recurso
              </th>
              <th className="text-center p-3 border-b border-border min-w-[130px]">
                <span className="text-sm font-bold text-muted-foreground">Teste</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Operação inicial</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Grátis · 7 dias</p>
              </th>
              <th className="text-center p-3 border-b border-border min-w-[130px]">
                <span className="text-sm font-bold text-primary">Essencial</span>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Gestão organizada</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">R$ 97/mês</p>
              </th>
              <th className="text-center p-3 border-b border-border min-w-[130px] bg-primary/5 rounded-t-lg">
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
                        <TooltipContent side="top" className="max-w-[280px] text-xs">
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
