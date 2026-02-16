import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { AnalysisUsage } from "@/hooks/useMenuMirror";
import {
  Flame, ChevronDown, ChevronUp, Star, Target, AlertTriangle,
  TrendingUp, Lightbulb, PenLine, Sparkles, DollarSign,
} from "lucide-react";

export interface PillarScore {
  id: string;
  name: string;
  emoji: string;
  score: number;
  status: string;
  analysis: string;
  suggestions: string[];
}

export interface MenuAnalysis {
  pillars: PillarScore[];
  totalScore: number;
  classification: string;
  classificationEmoji: string;
  strengths: string[];
  improvements: string[];
  ticketOpportunities: string[];
  starProduct: string;
  anchorProduct: string;
  problemProduct: string;
  rewrittenDescriptions: { original: string; newDescription: string }[];
  suggestedCombos: { name: string; items: string; strategy: string }[];
  priceAdjustments: { product: string; currentPrice: number; suggestedPrice: number; reason: string }[];
}

interface Props {
  analysis: MenuAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
  hasMenu: boolean;
  analysisUsage: AnalysisUsage | null;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-blue-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getProgressColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-blue-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Excelente" || status === "Bom") return "default";
  if (status === "Regular") return "secondary";
  return "destructive";
}

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 70 : 40;
  const stroke = size === "lg" ? 10 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = radius + stroke;
  const svgSize = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black ${size === "lg" ? "text-3xl" : "text-lg"} ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: PillarScore }) {
  const [expanded, setExpanded] = useState(false);
  const percent = pillar.score * 10;

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{pillar.emoji}</span>
              <span className="font-semibold text-sm text-foreground">{pillar.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getBadgeVariant(pillar.status)} className="text-[10px]">
                {pillar.status}
              </Badge>
              <span className={`font-bold text-sm ${getScoreColor(percent)}`}>
                {pillar.score}/10
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="relative h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getProgressColor(percent)}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{pillar.analysis}</p>
            {pillar.suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-yellow-500" /> Sugestões:
                </p>
                <ul className="space-y-1">
                  {pillar.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-[#EA1D2C] mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsageBadge({ usage }: { usage: AnalysisUsage | null }) {
  if (!usage) return null;
  const remaining = Math.max(0, usage.limit - usage.used);
  const percent = (usage.used / usage.limit) * 100;
  const isNearLimit = percent >= 80;
  const isAtLimit = usage.used >= usage.limit;

  const label = usage.plan === "free"
    ? (isAtLimit ? "Análise gratuita utilizada" : `${usage.used} de ${usage.limit} análise (única)`)
    : `${usage.used} de ${usage.limit} análises usadas este mês`;

  return (
    <div className="w-full max-w-xs mx-auto mt-2">
      <p className={`text-xs text-center ${isNearLimit ? "text-orange-500" : "text-muted-foreground"}`}>
        {label}
      </p>
      <Progress
        value={percent}
        className={`h-1 mt-1 ${isNearLimit ? "[&>div]:bg-orange-500" : ""}`}
      />
    </div>
  );
}

export function MenuPerformanceDashboard({ analysis, isLoading, onAnalyze, hasMenu, analysisUsage }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  if (!analysis && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Card className="border-2 border-dashed border-[#EA1D2C]/30 bg-gradient-to-br from-[#EA1D2C]/5 to-transparent">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EA1D2C]/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-[#EA1D2C]" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Menu Performance Score</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              A IA analisa seu cardápio em 10 pilares estratégicos e gera uma pontuação de 0 a 100 com insights para aumentar seu faturamento.
            </p>
            <Button
              onClick={onAnalyze}
              disabled={!hasMenu || isLoading || (analysisUsage ? analysisUsage.used >= analysisUsage.limit : false)}
              className="bg-[#EA1D2C] hover:bg-[#c9151f] text-white gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analisar Cardápio
            </Button>
            <UsageBadge usage={analysisUsage} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Card className="border border-[#EA1D2C]/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EA1D2C]/10 flex items-center justify-center animate-pulse">
              <Flame className="w-7 h-7 text-[#EA1D2C]" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Analisando seu cardápio...</h3>
            <p className="text-sm text-muted-foreground">
              A IA está avaliando 10 pilares estratégicos. Isso pode levar alguns segundos.
            </p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#EA1D2C] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
      {/* Main Score Card */}
      <Card className="border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#EA1D2C]" />
                <h3 className="font-bold text-sm uppercase tracking-wider opacity-80">Menu Performance Score</h3>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl">{analysis.classificationEmoji}</span>
                <div>
                  <p className="font-black text-xl">{analysis.classification}</p>
                  <p className="text-xs opacity-60">Baseado em 10 pilares estratégicos</p>
                </div>
              </div>
            </div>
            <ScoreGauge score={analysis.totalScore} />
          </div>
        </div>

        {/* Product Highlights */}
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {analysis.starProduct && (
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Star className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Estrela</p>
                <p className="text-xs font-semibold text-foreground truncate">{analysis.starProduct}</p>
              </div>
            )}
            {analysis.anchorProduct && (
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Target className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Âncora</p>
                <p className="text-xs font-semibold text-foreground truncate">{analysis.anchorProduct}</p>
              </div>
            )}
            {analysis.problemProduct && (
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                <AlertTriangle className="w-4 h-4 mx-auto text-red-500 mb-1" />
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Problema</p>
                <p className="text-xs font-semibold text-foreground truncate">{analysis.problemProduct}</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full gap-2 text-muted-foreground"
          >
            {showDetails ? "Ocultar detalhes" : "Ver análise completa"}
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>

      {/* Expanded Details */}
      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Pillar Scores */}
          <div className="space-y-2">
            {analysis.pillars.map((pillar) => (
              <PillarCard key={pillar.id} pillar={pillar} />
            ))}
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <Card className="border-emerald-200 dark:border-emerald-800/50">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4" /> O que está bom
                </h4>
                <ul className="space-y-1">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Improvements */}
          {analysis.improvements.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-800/50">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" /> O que precisa melhorar
                </h4>
                <ul className="space-y-1">
                  {analysis.improvements.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-orange-500 mt-0.5">⚠</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Ticket Opportunities */}
          {analysis.ticketOpportunities.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800/50">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" /> Oportunidades de Ticket Médio
                </h4>
                <ul className="space-y-1">
                  {analysis.ticketOpportunities.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">💰</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Rewritten Descriptions */}
          {analysis.rewrittenDescriptions && analysis.rewrittenDescriptions.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800/50">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2">
                  <PenLine className="w-4 h-4" /> Descrições Otimizadas
                </h4>
                <div className="space-y-3">
                  {analysis.rewrittenDescriptions.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">{d.original}</p>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{d.newDescription}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested Combos */}
          {analysis.suggestedCombos && analysis.suggestedCombos.length > 0 && (
            <Card className="border-[#EA1D2C]/20">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-[#EA1D2C] flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" /> Combos Sugeridos pela IA
                </h4>
                <div className="space-y-3">
                  {analysis.suggestedCombos.map((c, i) => (
                    <div key={i} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 space-y-1">
                      <p className="text-xs font-bold text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.items}</p>
                      <p className="text-[10px] text-muted-foreground italic">{c.strategy}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Adjustments */}
          {analysis.priceAdjustments && analysis.priceAdjustments.length > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800/50">
              <CardContent className="p-4">
                <h4 className="font-bold text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4" /> Ajustes de Preço Sugeridos
                </h4>
                <div className="space-y-2">
                  {analysis.priceAdjustments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{a.product}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through">
                          R$ {Number(a.currentPrice).toFixed(2)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          R$ {Number(a.suggestedPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Re-analyze */}
          <div className="text-center pb-2 space-y-2">
            <Button variant="outline" size="sm" onClick={onAnalyze} className="gap-2"
              disabled={analysisUsage ? analysisUsage.used >= analysisUsage.limit : false}
            >
              <Sparkles className="w-3.5 h-3.5" /> Analisar novamente
            </Button>
            <UsageBadge usage={analysisUsage} />
          </div>
        </div>
      )}
    </div>
  );
}
