import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Target,
  ShoppingBag,
  Users,
  Zap,
  RotateCcw,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCombos, type Combo } from "@/hooks/useCombos";

const OBJECTIVES = [
  { id: "ticket_medio", label: "Aumentar ticket médio", icon: TrendingUp, color: "text-primary" },
  { id: "dias_fracos", label: "Vender mais em dias fracos", icon: Target, color: "text-warning" },
  { id: "percepcao_vantagem", label: "Criar percepção de vantagem", icon: ShoppingBag, color: "text-success" },
  { id: "girar_estoque", label: "Girar estoque", icon: RotateCcw, color: "text-destructive" },
  { id: "combo_familia", label: "Criar combo família", icon: Users, color: "text-primary" },
  { id: "teste_rapido", label: "Teste rápido", icon: Zap, color: "text-warning" },
];

const ROLE_LABELS: Record<string, string> = {
  main: "Principal",
  accompaniment: "Acompanhamento",
  beverage: "Bebida",
  bait: "Isca",
};

export default function Combos() {
  const navigate = useNavigate();
  const {
    combos,
    isLoading,
    isGenerating,
    monthlyUsage,
    usageLimit,
    canGenerate,
    isFree,
    generateCombo,
    deleteCombo,
    objectiveLabels,
  } = useCombos();

  const [showObjectiveSelector, setShowObjectiveSelector] = useState(false);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null);

  const handleGenerate = async (objectiveId: string) => {
    setShowObjectiveSelector(false);
    await generateCombo(objectiveId);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground">
                  Combos Inteligentes
                </h1>
                <Badge variant="outline" className="text-xs font-medium border-warning text-warning">
                  BETA
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Crie combos lucrativos com IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              {monthlyUsage} / {usageLimit ?? "∞"} este mês
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Beta Warning */}
        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm text-muted-foreground">
            ⚠️ Esta funcionalidade está em versão <strong>BETA</strong> e utiliza Inteligência Artificial.
            Os resultados são <strong>sugestões estratégicas</strong> e devem ser revisados antes de publicar.
          </AlertDescription>
        </Alert>

        {/* Free plan notice */}
        {isFree && (
          <Alert className="border-primary/30 bg-primary/5">
            <Crown className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              No plano Free, você pode gerar <strong>1 simulação</strong> para conhecer a funcionalidade.
              Faça upgrade para criar combos reais.
            </AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        {!showObjectiveSelector ? (
          <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Button
                size="lg"
                onClick={() => setShowObjectiveSelector(true)}
                disabled={!canGenerate || isGenerating}
                className="text-lg px-8 py-6 gap-3"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isGenerating ? "Gerando combo..." : "Gerar combo com IA"}
              </Button>
        {!canGenerate && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 max-w-sm text-center">
                  <Crown className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Limite mensal atingido
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Desbloqueie 3 combos extras por R$ 9,99
                  </p>
                  <Button size="sm" variant="outline" disabled className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Em breve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Objective Selector */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Qual é o seu objetivo com este combo?
              </CardTitle>
              <CardDescription>
                Escolha o objetivo e a IA criará o melhor combo para você
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => handleGenerate(obj.id)}
                    disabled={isGenerating}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${obj.color}`}>
                      <obj.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{obj.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowObjectiveSelector(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isGenerating && (
          <Card className="border-primary/20">
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Analisando seu cardápio...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A IA está criando o combo ideal com base nos seus dados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combos List */}
        {combos.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Seus Combos ({combos.length})
            </h2>

            {combos.map((combo) => {
              const isExpanded = expandedCombo === combo.id;
              return (
                <Card key={combo.id} className="overflow-hidden">
                  <div
                    className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedCombo(isExpanded ? null : combo.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{combo.name}</h3>
                          {combo.status === "simulation" && (
                            <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
                              <FlaskConical className="w-3 h-3 mr-1" />
                              Simulação
                            </Badge>
                          )}
                          {combo.status === "draft" && (
                            <Badge variant="outline" className="text-xs">Rascunho</Badge>
                          )}
                          {combo.status === "published" && (
                            <Badge className="text-xs bg-success text-success-foreground">Publicado</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {combo.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {objectiveLabels[combo.objective] || combo.objective}
                          </span>
                          <span>
                            {new Date(combo.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            {formatCurrency(combo.combo_price)}
                          </p>
                          <p className="text-xs text-success font-medium">
                            Margem: {combo.margin_percent.toFixed(1)}%
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-5 bg-muted/10 space-y-5">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground">
                          Itens do Combo
                        </h4>
                        <div className="space-y-2">
                          {(combo as any).items?.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {item.item_name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {ROLE_LABELS[item.role] || item.role}
                                </Badge>
                                {item.is_bait && (
                                  <Badge className="text-xs bg-warning/20 text-warning-foreground border-warning/30">
                                    Isca
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(item.individual_price)}
                              </span>
                            </div>
                          )) || (
                            <p className="text-sm text-muted-foreground italic">
                              Detalhes dos itens não disponíveis para combos salvos anteriormente.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground">Individual</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(combo.individual_total_price)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                          <p className="text-xs text-primary">Preço Combo</p>
                          <p className="font-bold text-primary">
                            {formatCurrency(combo.combo_price)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground">Custo Total</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(combo.total_cost)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
                          <p className="text-xs text-success">Lucro</p>
                          <p className="font-bold text-success">
                            {formatCurrency(combo.estimated_profit)}
                          </p>
                        </div>
                      </div>

                      {/* Discount badge */}
                      {combo.individual_total_price > combo.combo_price && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-success/10 text-success border-success/20">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Economia de {formatCurrency(combo.individual_total_price - combo.combo_price)} para o cliente
                          </Badge>
                        </div>
                      )}

                      {/* Strategy */}
                      {combo.strategy_explanation && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-sm font-medium text-primary mb-1">💡 Estratégia</p>
                          <p className="text-sm text-foreground">{combo.strategy_explanation}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(combo);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {combos.length === 0 && !isGenerating && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-foreground mb-1">Nenhum combo criado ainda</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Use a IA para gerar combos lucrativos baseados no seu cardápio e custos reais.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir combo?</AlertDialogTitle>
            <AlertDialogDescription>
              O combo "{deleteTarget?.name}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteCombo(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
