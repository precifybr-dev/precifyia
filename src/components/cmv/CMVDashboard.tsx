import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, BarChart3, AlertTriangle, ArrowRight } from "lucide-react";
import { CMVPeriodo } from "@/hooks/useCMV";

interface CMVDashboardProps {
  periodoAtual: CMVPeriodo;
  periodos: CMVPeriodo[];
  metaAutomatica: { meta: number | null; melhorMes: number | null; media: number | null };
  getStatusCMV: (p: number) => { label: string; color: "success" | "warning" | "destructive"; emoji: string };
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CMVDashboard({ periodoAtual, periodos, metaAutomatica, getStatusCMV }: CMVDashboardProps) {
  const status = getStatusCMV(Number(periodoAtual.cmv_percentual));
  const meta = periodoAtual.meta_definida ?? metaAutomatica.meta;
  const diffMeta = meta ? Number(periodoAtual.cmv_percentual) - meta : null;

  // Últimos 6 meses para evolução
  const ultimos6 = periodos
    .filter((p) => Number(p.cmv_percentual) > 0)
    .slice(0, 6)
    .reverse();

  const maxCmvPercent = Math.max(...ultimos6.map((p) => Number(p.cmv_percentual)), 50);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CMV Total */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">CMV Total</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(periodoAtual.cmv_calculado))}</p>
          </CardContent>
        </Card>

        {/* CMV % */}
        <Card className={`border-${status.color}/30`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{status.emoji}</span>
              <span className="text-xs text-muted-foreground">CMV %</span>
            </div>
            <p className="text-xl font-bold">{Number(periodoAtual.cmv_percentual).toFixed(1)}%</p>
            <Badge variant={status.color === "success" ? "default" : status.color === "warning" ? "secondary" : "destructive"} className="text-xs mt-1">
              {status.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Meta</span>
            </div>
            <p className="text-xl font-bold">{meta ? `${meta.toFixed(1)}%` : "—"}</p>
            {diffMeta !== null && (
              <p className={`text-xs mt-1 ${diffMeta > 0 ? "text-destructive" : "text-success"}`}>
                {diffMeta > 0 ? `+${diffMeta.toFixed(1)}% acima` : `${Math.abs(diffMeta).toFixed(1)}% abaixo`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Impacto no lucro */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              {diffMeta && diffMeta > 0 ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : (
                <TrendingUp className="w-4 h-4 text-success" />
              )}
              <span className="text-xs text-muted-foreground">Faturamento Líq.</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(periodoAtual.faturamento_liquido))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta CMV alto */}
      {diffMeta !== null && diffMeta > 3 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Seu CMV real está acima do estimado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pode haver desperdício, erro de porcionamento ou falha operacional. Revise seus processos e compare com suas fichas técnicas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta automática sugerida */}
      {metaAutomatica.meta && !periodoAtual.meta_definida && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Meta Sugerida: {metaAutomatica.meta}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Com base no seu histórico, sua meta ideal é {metaAutomatica.meta}%. 
                  Média dos últimos 3 meses: {metaAutomatica.media}% | Melhor mês: {metaAutomatica.melhorMes}%.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolução mensal */}
      {ultimos6.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evolução do CMV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {ultimos6.map((p) => {
                const pct = Number(p.cmv_percentual);
                const height = (pct / maxCmvPercent) * 100;
                const s = getStatusCMV(pct);
                const colorClass =
                  s.color === "success" ? "bg-success" : s.color === "warning" ? "bg-warning" : "bg-destructive";
                return (
                  <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{pct.toFixed(0)}%</span>
                    <div
                      className={`w-full rounded-t-md ${colorClass} transition-all`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {MESES[p.mes - 1]}/{String(p.ano).slice(-2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modo info */}
      <div className="text-center">
        <Badge variant="outline" className="text-xs">
          Modo: {periodoAtual.modo === "simplificado" ? "Simplificado" : periodoAtual.modo === "completo" ? "Completo" : "Avançado"}
        </Badge>
      </div>
    </div>
  );
}
