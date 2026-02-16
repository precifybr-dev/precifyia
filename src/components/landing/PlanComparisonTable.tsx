import { Check, X } from "lucide-react";

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  essencial: string | boolean;
  pro: string | boolean;
}

const comparisonData: ComparisonRow[] = [
  { feature: "Fichas técnicas (receitas)", free: "2", essencial: "8", pro: "Ilimitadas" },
  { feature: "Insumos cadastrados", free: "35", essencial: "100", pro: "Ilimitados" },
  { feature: "Dashboard", free: "Básico", essencial: "Completo", pro: "Avançado + DRE" },
  { feature: "Análise de cardápio (IA)", free: "1 (única)", essencial: "5/mês", pro: "10/mês" },
  { feature: "Combos estratégicos (IA)", free: "1 (único)", essencial: "3/mês", pro: "5/mês" },
  { feature: "Importação iFood", free: "1 (única)", essencial: "5/mês", pro: "Ilimitada" },
  { feature: "Importação de planilha", free: "1 (única, até 35 insumos)", essencial: "3/mês", pro: "Ilimitada" },
  { feature: "Sub-receitas", free: false, essencial: true, pro: true },
  { feature: "Exportação de dados", free: false, essencial: true, pro: true },
  { feature: "Multi-loja", free: false, essencial: false, pro: "Até 3 lojas" },
  { feature: "Colaboradores", free: false, essencial: false, pro: true },
  { feature: "Suporte", free: "Padrão", essencial: "Padrão", pro: "Via WhatsApp" },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
    ) : (
      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

export function PlanComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-sm font-semibold text-muted-foreground p-3 border-b border-border sticky left-0 bg-muted/30 min-w-[160px]">
              Recurso
            </th>
            <th className="text-center p-3 border-b border-border min-w-[120px]">
              <span className="text-sm font-bold text-muted-foreground">Teste</span>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Grátis</p>
            </th>
            <th className="text-center p-3 border-b border-border min-w-[120px]">
              <span className="text-sm font-bold text-primary">Essencial</span>
              <p className="text-xs text-muted-foreground/70 mt-0.5">R$ 97/mês</p>
            </th>
            <th className="text-center p-3 border-b border-border min-w-[120px] bg-primary/5 rounded-t-lg">
              <span className="text-sm font-bold text-primary">Pro</span>
              <p className="text-xs text-muted-foreground/70 mt-0.5">R$ 147/mês</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, i) => (
            <tr key={row.feature} className={i % 2 === 0 ? "bg-muted/10" : ""}>
              <td className="text-sm text-foreground p-3 border-b border-border/50 sticky left-0 bg-inherit font-medium">
                {row.feature}
              </td>
              <td className="text-center p-3 border-b border-border/50">
                <CellValue value={row.free} />
              </td>
              <td className="text-center p-3 border-b border-border/50">
                <CellValue value={row.essencial} />
              </td>
              <td className="text-center p-3 border-b border-border/50 bg-primary/5">
                <CellValue value={row.pro} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-3 text-center italic">
        * Todos os limites são por conta, independente do número de lojas cadastradas.
      </p>
    </div>
  );
}
