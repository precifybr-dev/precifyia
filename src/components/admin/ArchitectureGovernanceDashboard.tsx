import { useState, useEffect, useRef } from "react";
import {
  useArchitectureGovernance, CATEGORY_LABELS, STATUS_LABELS, CRITICALITY_LABELS,
  type ArchitecturePrompt, type RiskLevel, type PromptVersion,
} from "@/hooks/useArchitectureGovernance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, Code2, FileText, Plus, Search, CheckCircle2, AlertTriangle, XCircle,
  History, ClipboardPaste, BarChart3, Trash2, ChevronDown, ChevronRight,
  Layers, BookOpen, ArrowRight, Award, TrendingUp, Activity, Gauge, Copy, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const STATUS_ICONS = {
  implementado: CheckCircle2,
  parcial: AlertTriangle,
  nao_implementado: XCircle,
};

const STATUS_COLORS = {
  implementado: "text-green-600 dark:text-green-400",
  parcial: "text-amber-600 dark:text-amber-400",
  nao_implementado: "text-red-600 dark:text-red-400",
};

const CRITICALITY_COLORS = {
  alto: "bg-destructive/10 text-destructive border-destructive/20",
  medio: "bg-warning/10 text-warning border-warning/20",
  baixo: "bg-primary/10 text-primary border-primary/20",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  seguranca: Shield,
  backend: Code2,
  frontend: Layers,
  ux_educacao: BookOpen,
  backup_continuidade: History,
  infraestrutura: BarChart3,
  versionamento: FileText,
  logs_auditoria: History,
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  baixo: { label: "Risco Baixo", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  medio: { label: "Risco Médio", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  alto: { label: "Risco Alto", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
};

// ─── Score Gauge ───
function ScoreGauge({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 85 ? "hsl(142, 71%, 45%)" : score >= 60 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)";
  const data = [{ value: score, fill: color }];
  const dim = size === "lg" ? 160 : 100;

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: dim, height: dim }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={data}>
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold", size === "lg" ? "text-3xl" : "text-xl")}>{score}</span>
          <span className="text-[10px] text-muted-foreground uppercase">/100</span>
        </div>
      </div>
      <p className={cn("font-medium mt-1", size === "lg" ? "text-sm" : "text-xs")}>{label}</p>
    </div>
  );
}

// ─── Version Timeline ───
function VersionTimeline({ versions, currentText }: { versions: PromptVersion[]; currentText: string }) {
  const { toast } = useToast();
  const [showVersions, setShowVersions] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência` });
  };

  if (versions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Clock className="h-3.5 w-3.5" />
        <span>Sem histórico de versões (versão atual é a original)</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Collapsible open={showVersions} onOpenChange={setShowVersions}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-xs h-7 px-2">
            <History className="h-3.5 w-3.5" />
            Histórico de Versões ({versions.length + 1})
            {showVersions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 pl-3 border-l-2 border-primary/20 space-y-3 mt-2">
            {/* Current version */}
            <div className="relative">
              <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
              <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">v{versions.length + 1} — Atual</Badge>
                  <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={() => copyToClipboard(currentText, `v${versions.length + 1}`)}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap max-h-20 overflow-y-auto text-muted-foreground">{currentText.substring(0, 200)}{currentText.length > 200 ? "..." : ""}</pre>
              </div>
            </div>

            {/* Previous versions (newest first) */}
            {[...versions].reverse().map((v) => (
              <div key={v.id} className="relative">
                <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-muted-foreground/30 border-2 border-background" />
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">v{v.version_number}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(v.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={() => copyToClipboard(v.prompt_text, `v${v.version_number}`)}>
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                  </div>
                  {v.change_reason && (
                    <p className="text-xs text-muted-foreground italic">Motivo: {v.change_reason}</p>
                  )}
                  <pre className="text-xs whitespace-pre-wrap max-h-20 overflow-y-auto text-muted-foreground">{v.prompt_text.substring(0, 200)}{v.prompt_text.length > 200 ? "..." : ""}</pre>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── New Prompt Dialog ───
function NewPromptDialog({ onSave }: { onSave: (data: Partial<ArchitecturePrompt>) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ArchitecturePrompt>>({
    name: "", category: "backend", description: "", prompt_text: "",
    status: "nao_implementado", criticality: "medio",
    related_files: [], related_functions: [], related_tables: [],
    related_policies: [], related_edge_functions: [], impacts: [], dependencies: [],
  });

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    const ok = await onSave(form);
    if (ok) {
      setOpen(false);
      setForm({ name: "", category: "backend", description: "", prompt_text: "", status: "nao_implementado", criticality: "medio", related_files: [], related_functions: [], related_tables: [], related_policies: [], related_edge_functions: [], impacts: [], dependencies: [] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Registrar Prompt</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar Prompt Estrutural</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: RBAC – Controle de Acesso" />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição Técnica</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">Prompt Original</label>
            <Textarea value={form.prompt_text} onChange={e => setForm(f => ({ ...f, prompt_text: e.target.value }))} rows={4} placeholder="Cole o prompt usado..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Criticidade</label>
              <Select value={form.criticality} onValueChange={v => setForm(f => ({ ...f, criticality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CRITICALITY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data Implementação</label>
              <Input type="date" value={form.implementation_date || ""} onChange={e => setForm(f => ({ ...f, implementation_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tabelas Relacionadas (vírgula)</label>
            <Input value={(form.related_tables || []).join(", ")} onChange={e => setForm(f => ({ ...f, related_tables: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Arquivos Relacionados (vírgula)</label>
            <Input value={(form.related_files || []).join(", ")} onChange={e => setForm(f => ({ ...f, related_files: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Edge Functions (vírgula)</label>
            <Input value={(form.related_edge_functions || []).join(", ")} onChange={e => setForm(f => ({ ...f, related_edge_functions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name?.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prompt Card with Version History ───
function PromptCard({ prompt, versions, onUpdate, onDelete }: { prompt: ArchitecturePrompt; versions: PromptVersion[]; onUpdate: (id: string, data: Partial<ArchitecturePrompt>) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICONS[prompt.status as keyof typeof STATUS_ICONS] || XCircle;
  const CatIcon = CATEGORY_ICONS[prompt.category] || Code2;
  const { toast } = useToast();

  return (
    <Card className="bg-card">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted"><CatIcon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm">{prompt.name}</CardTitle>
                  <Badge variant="outline" className={cn("text-xs", CRITICALITY_COLORS[prompt.criticality as keyof typeof CRITICALITY_COLORS])}>
                    {CRITICALITY_LABELS[prompt.criticality] || prompt.criticality}
                  </Badge>
                  {versions.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <History className="h-3 w-3" /> v{versions.length + 1}
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-1 line-clamp-2">{prompt.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", STATUS_COLORS[prompt.status as keyof typeof STATUS_COLORS])} />
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-muted-foreground">Categoria:</span><p className="font-medium">{CATEGORY_LABELS[prompt.category]}</p></div>
              <div><span className="text-muted-foreground">Status:</span><p className="font-medium">{STATUS_LABELS[prompt.status]}</p></div>
              <div><span className="text-muted-foreground">Implementação:</span><p className="font-medium">{prompt.implementation_date ? format(new Date(prompt.implementation_date), "dd/MM/yyyy") : "—"}</p></div>
              <div><span className="text-muted-foreground">Atualizado:</span><p className="font-medium">{format(new Date(prompt.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
            </div>
            {prompt.prompt_text && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Prompt Atual (v{versions.length + 1}):</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(prompt.prompt_text); toast({ title: "Prompt copiado!" }); }}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">{prompt.prompt_text}</pre>
              </div>
            )}

            {/* Version Timeline */}
            <VersionTimeline versions={versions} currentText={prompt.prompt_text} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prompt.related_tables.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Tabelas:</p><div className="flex flex-wrap gap-1">{prompt.related_tables.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div></div>)}
              {prompt.related_edge_functions.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Edge Functions:</p><div className="flex flex-wrap gap-1">{prompt.related_edge_functions.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div></div>)}
              {prompt.related_files.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Arquivos:</p><div className="flex flex-wrap gap-1">{prompt.related_files.map(t => <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>)}</div></div>)}
              {prompt.dependencies.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Dependências:</p><div className="flex flex-wrap gap-1">{prompt.dependencies.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></div>)}
            </div>
            <div className="flex gap-2 pt-2">
              <Select value={prompt.status} onValueChange={v => onUpdate(prompt.id, { status: v })}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => onDelete(prompt.id)} className="text-destructive hover:text-destructive h-8"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Import Tab ───
function ImportTab({ onImport }: { onImport: (text: string) => Promise<{ extracted: Partial<ArchitecturePrompt>[]; report: string }> }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState("");
  const [extracted, setExtracted] = useState<Partial<ArchitecturePrompt>[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const result = await onImport(text);
    setExtracted(result.extracted);
    setReport(result.report);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> Importar Estrutura de Outro Chat</CardTitle>
          <CardDescription>Cole a resposta de outro ChatGPT para extrair prompts e decisões arquiteturais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Cole aqui o conteúdo completo..." rows={10} />
          <Button onClick={handleAnalyze} disabled={!text.trim() || loading} className="gap-2">
            <Search className="h-4 w-4" />{loading ? "Analisando..." : "Analisar & Comparar"}
          </Button>
        </CardContent>
      </Card>
      {report && (
        <Card>
          <CardHeader><CardTitle className="text-base">Relatório de Comparação</CardTitle><CardDescription>{extracted.length} prompts extraídos</CardDescription></CardHeader>
          <CardContent><pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">{report}</pre></CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───
export function ArchitectureGovernanceDashboard() {
  const {
    prompts, history, baseChecks, scoreHistory, certifications, activeCertification,
    promptVersions, saasPhasePrompts,
    isLoading, stats,
    createPrompt, updatePrompt, deletePrompt, toggleBaseCheck,
    importFromText, getComplianceReport, getVersionsForPrompt,
    calculateMaturityScores, calculateRisk, checkCertificationEligibility,
    issueCertification, saveScoreSnapshot,
  } = useArchitectureGovernance();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const autoSnapshotDone = useRef(false);

  // Auto-save score snapshot on first load
  useEffect(() => {
    if (!isLoading && !autoSnapshotDone.current && baseChecks.length > 0) {
      autoSnapshotDone.current = true;
      saveScoreSnapshot(true);
    }
  }, [isLoading, baseChecks, saveScoreSnapshot]);

  const compliance = getComplianceReport();
  const scores = calculateMaturityScores();
  const risk = calculateRisk();
  const eligibility = checkCertificationEligibility();
  const riskCfg = RISK_CONFIG[risk.level];

  const blockingPhases = compliance.filter(c => c.isBlocking && !c.allCompleted);

  const filtered = prompts.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const scoreEvolutionData = scoreHistory.slice().reverse().map(s => ({
    date: format(new Date(s.created_at), "dd/MM"),
    overall: Number(s.overall_score),
    security: Number(s.security_score),
    backend: Number(s.backend_score),
    continuity: Number(s.continuity_score),
  }));

  // Group saas phase prompts by phase
  const phasePromptsGrouped = saasPhasePrompts.reduce<Record<number, typeof saasPhasePrompts>>((acc, p) => {
    if (!acc[p.phase]) acc[p.phase] = [];
    acc[p.phase].push(p);
    return acc;
  }, {});

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência` });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Score de Maturidade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreGauge score={scores.overall} label="Score Geral" size="lg" />
            <Button size="sm" variant="outline" onClick={() => saveScoreSnapshot()} className="gap-2 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Registrar Snapshot
            </Button>
          </CardContent>
        </Card>

        <Card className={cn("bg-card border", riskCfg.borderColor)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Indicador de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-center p-4 rounded-lg", riskCfg.bgColor)}>
              <Shield className={cn("h-10 w-10 mx-auto mb-2", riskCfg.color)} />
              <p className={cn("text-xl font-bold", riskCfg.color)}>{riskCfg.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{risk.failures.length} falha(s) detectada(s)</p>
            </div>
            {risk.failures.length > 0 && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                {risk.failures.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-muted/30">
                    <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    <div><span className="font-medium">{f.area}:</span> {f.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("bg-card border", activeCertification ? "border-green-500/30" : "border-muted")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Selo de Certificação</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCertification ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mx-auto">
                  <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-green-600 dark:text-green-400">ARQUITETURA APROVADA</p>
                  <p className="text-xs text-muted-foreground">Certificado em {format(new Date(activeCertification.certified_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  <p className="text-xs text-muted-foreground">Score: {Number(activeCertification.overall_score)}/100</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mx-auto">
                  <Award className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Sem certificação ativa</p>
                  {!eligibility.eligible && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                      {eligibility.reasons.map((r, i) => (
                        <p key={i} className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> {r}</p>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" disabled={!eligibility.eligible} onClick={issueCertification} className="gap-2">
                  <Award className="h-4 w-4" />
                  {eligibility.eligible ? "Emitir Certificação" : "Requisitos não atendidos"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Scores */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score por Categoria (pesos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <ScoreGauge score={scores.security} label="Segurança (30%)" size="sm" />
            <ScoreGauge score={scores.backend} label="Backend (20%)" size="sm" />
            <ScoreGauge score={scores.continuity} label="Continuidade (20%)" size="sm" />
            <ScoreGauge score={scores.help} label="Ajuda (10%)" size="sm" />
            <ScoreGauge score={scores.ux} label="UX (10%)" size="sm" />
            <ScoreGauge score={scores.governance} label="Governança (10%)" size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Score Evolution */}
      {scoreEvolutionData.length > 1 && (
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Evolução do Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} name="Geral" dot={false} />
                  <Line type="monotone" dataKey="security" stroke="hsl(142, 71%, 45%)" strokeWidth={1.5} name="Segurança" dot={false} />
                  <Line type="monotone" dataKey="backend" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} name="Backend" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness Alert */}
      {blockingPhases.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">SaaS NÃO pode ser marcado como "Produção Estável"</p>
              <p className="text-xs text-muted-foreground">Fases bloqueantes incompletas: {blockingPhases.map(p => p.name).join(", ")} | Score: {scores.overall}/100 (mínimo: 80)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><FileText className="h-4 w-4" /> Prompts</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Shield className="h-4 w-4" /> Auditoria</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><BarChart3 className="h-4 w-4" /> Arquitetura Base</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Layers className="h-4 w-4" /> Novo SaaS</TabsTrigger>
          <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><ClipboardPaste className="h-4 w-4" /> Importar</TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Award className="h-4 w-4" /> Certificações</TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        {/* ── Prompts ── */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar prompts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <NewPromptDialog onSave={createPrompt} />
          </div>
          {filtered.length === 0 ? (
            <Card className="bg-card"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhum prompt registrado</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <PromptCard key={p.id} prompt={p} versions={getVersionsForPrompt(p.id)} onUpdate={updatePrompt} onDelete={deletePrompt} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Auditoria ── */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Relatório de Risco Estrutural</CardTitle>
              <CardDescription>Análise automática de implementação vs prompts registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {prompts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Registre prompts para gerar o relatório.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
                    const catPrompts = prompts.filter(p => p.category === catKey);
                    if (catPrompts.length === 0) return null;
                    const implemented = catPrompts.filter(p => p.status === "implementado").length;
                    const pct = Math.round((implemented / catPrompts.length) * 100);
                    const CatIcon = CATEGORY_ICONS[catKey] || Code2;
                    return (
                      <div key={catKey} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <CatIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{catLabel}</span>
                            <span className="text-xs text-muted-foreground">{implemented}/{catPrompts.length} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                        {pct === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {pct >= 50 && pct < 100 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {pct < 50 && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    );
                  })}
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Falhas Detectadas ({risk.failures.length})</h4>
                  {risk.failures.length === 0 ? (
                    <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Nenhuma falha detectada</p>
                  ) : (
                    <div className="space-y-2">
                      {risk.failures.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            <span className="text-sm font-medium">{f.description}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">Área: {f.area} • Impacto: {f.impact}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Compliance ── */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Conformidade com Arquitetura Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {compliance.map(phase => (
                <div key={phase.phase} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center">{phase.phase}</span>
                      <span className="text-sm font-semibold">{phase.name}</span>
                      {phase.isBlocking && <Badge variant="destructive" className="text-xs">BLOQUEANTE</Badge>}
                    </div>
                    <span className="text-sm font-medium">{phase.completed}/{phase.total} ({phase.percentage}%)</span>
                  </div>
                  <Progress value={phase.percentage} className={cn("h-2", phase.isBlocking && phase.percentage < 100 && "[&>div]:bg-destructive")} />
                  <div className="space-y-1 ml-8">
                    {baseChecks.filter(c => c.phase === phase.phase).map(check => (
                      <div key={check.id} className="flex items-center gap-2">
                        <Checkbox checked={check.is_completed} onCheckedChange={(v) => toggleBaseCheck(check.id, !!v)} />
                        <span className={cn("text-sm", check.is_completed && "line-through text-muted-foreground")}>{check.check_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Novo SaaS Checklist with Generic Prompts ── */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Ordem Padrão Obrigatória – Novo SaaS</CardTitle>
              <CardDescription>Fases 1 e 3 são bloqueantes. Score mínimo para produção: 80. Cada fase contém prompts genéricos copiáveis para qualquer projeto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {compliance.map((phase) => (
                <div key={phase.phase}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      phase.allCompleted ? "bg-green-500/10 text-green-600" : phase.isBlocking ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                      {phase.allCompleted ? <CheckCircle2 className="h-5 w-5" /> : phase.phase}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">FASE {phase.phase} — {phase.name}</h3>
                      <p className="text-xs text-muted-foreground">{phase.completed}/{phase.total} completo{phase.isBlocking && " • BLOQUEANTE"}</p>
                    </div>
                  </div>
                  <div className="ml-5 pl-5 border-l-2 border-muted space-y-2">
                    {baseChecks.filter(c => c.phase === phase.phase).map(check => (
                      <div key={check.id} className="flex items-center gap-3 py-1">
                        {check.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />}
                        <span className={cn("text-sm", check.is_completed && "text-muted-foreground")}>{check.check_name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Generic Phase Prompts */}
                  {phasePromptsGrouped[phase.phase] && phasePromptsGrouped[phase.phase].length > 0 && (
                    <div className="ml-5 pl-5 border-l-2 border-primary/20 mt-3 space-y-3">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Copy className="h-3.5 w-3.5" /> Prompts Genéricos para esta Fase
                      </p>
                      {phasePromptsGrouped[phase.phase].map((pp) => (
                        <Collapsible key={pp.id}>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between cursor-pointer group">
                                <div className="flex-1">
                                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{pp.prompt_title}</p>
                                  {pp.problem_description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pp.problem_description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(pp.prompt_text, pp.prompt_title); }}
                                  >
                                    <Copy className="h-3 w-3" /> Copiar
                                  </Button>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <Separator className="my-2" />
                              {pp.problem_description && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-destructive/80 mb-1">Problema que resolve:</p>
                                  <p className="text-xs text-muted-foreground">{pp.problem_description}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Prompt completo:</p>
                                <pre className="text-xs bg-background p-3 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto border">{pp.prompt_text}</pre>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Importar ── */}
        <TabsContent value="import"><ImportTab onImport={importFromText} /></TabsContent>

        {/* ── Certificações ── */}
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Histórico de Certificações</CardTitle>
              <CardDescription>Todas as certificações emitidas e revogadas</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {certifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground"><Award className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Nenhuma certificação emitida</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Risco</TableHead>
                        <TableHead>Certificado em</TableHead>
                        <TableHead>Revogado em</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certifications.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            {c.is_valid ? (
                              <Badge className="bg-green-500/10 text-green-600 border-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Válido</Badge>
                            ) : (
                              <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Revogado</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">{Number(c.overall_score)}/100</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{c.risk_level}</Badge></TableCell>
                          <TableCell className="text-xs">{format(new Date(c.certified_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell className="text-xs">{c.revoked_at ? format(new Date(c.revoked_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}</TableCell>
                          <TableCell className="text-xs max-w-xs truncate">{c.revocation_reason || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Histórico ── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Histórico Estrutural</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {history.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground"><History className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Nenhuma alteração registrada</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Ação</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Data</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {history.map(h => (
                        <TableRow key={h.id}>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{h.action.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{h.description}</TableCell>
                          <TableCell>
                            {h.old_status && h.new_status ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span>{STATUS_LABELS[h.old_status] || h.old_status}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium">{STATUS_LABELS[h.new_status] || h.new_status}</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
