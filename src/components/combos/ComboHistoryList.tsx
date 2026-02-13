import { useState } from "react";
import {
  ChevronDown, ChevronUp, Trash2, DollarSign, Target,
  FlaskConical, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type Combo } from "@/hooks/useCombos";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  main: "Principal",
  accompaniment: "Acompanhamento",
  beverage: "Bebida",
  bait: "Isca",
};

interface ComboHistoryListProps {
  combos: Combo[];
  objectiveLabels: Record<string, string>;
  onDelete: (id: string) => void;
}

export function ComboHistoryList({ combos, objectiveLabels, onDelete }: ComboHistoryListProps) {
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (combos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-foreground mb-1">Nenhum combo criado ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use a IA para gerar combos lucrativos baseados no seu cardápio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{combos.length} combo(s) criado(s)</p>
        {combos.map(combo => {
          const isExpanded = expandedCombo === combo.id;
          return (
            <Card key={combo.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCombo(isExpanded ? null : combo.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm">{combo.name}</h3>
                      {combo.status === "simulation" && (
                        <Badge variant="outline" className="text-[10px] border-muted-foreground text-muted-foreground">
                          <FlaskConical className="w-3 h-3 mr-1" /> Simulação
                        </Badge>
                      )}
                      {combo.status === "draft" && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}
                      {combo.status === "published" && <Badge className="text-[10px] bg-success text-success-foreground">Publicado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{combo.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" />{objectiveLabels[combo.objective] || combo.objective}</span>
                      <span>{new Date(combo.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(combo.combo_price)}</p>
                      <p className="text-[11px] text-success font-medium">Margem: {combo.margin_percent.toFixed(1)}%</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 bg-muted/10 space-y-4">
                  {/* Items */}
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-foreground uppercase tracking-wider">Itens do Combo</h4>
                    <div className="space-y-1.5">
                      {(combo as any).items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.item_name}</span>
                            <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[item.role] || item.role}</Badge>
                            {item.is_bait && <Badge className="text-[10px] bg-warning/20 text-warning-foreground border-warning/30">Isca</Badge>}
                          </div>
                          <span className="text-sm text-muted-foreground">{formatCurrency(item.individual_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Individual", value: combo.individual_total_price, cls: "" },
                      { label: "Preço Combo", value: combo.combo_price, cls: "bg-primary/5 border-primary/20 text-primary" },
                      { label: "Custo Total", value: combo.total_cost, cls: "" },
                      { label: "Lucro", value: combo.estimated_profit, cls: "bg-success/5 border-success/20 text-success" },
                    ].map(s => (
                      <div key={s.label} className={cn("p-3 rounded-lg bg-background border border-border text-center", s.cls)}>
                        <p className="text-[10px] opacity-70">{s.label}</p>
                        <p className="font-bold text-sm">{formatCurrency(s.value)}</p>
                      </div>
                    ))}
                  </div>

                  {combo.individual_total_price > combo.combo_price && (
                    <Badge className="bg-success/10 text-success border-success/20">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Economia de {formatCurrency(combo.individual_total_price - combo.combo_price)}
                    </Badge>
                  )}

                  {combo.strategy_explanation && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">💡 Estratégia</p>
                      <p className="text-sm text-foreground">{combo.strategy_explanation}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(combo); }}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir combo?</AlertDialogTitle>
            <AlertDialogDescription>O combo "{deleteTarget?.name}" será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
