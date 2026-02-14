import { useState } from "react";
import { useArchitectureGovernance, CATEGORY_LABELS, STATUS_LABELS, CRITICALITY_LABELS, type ArchitecturePrompt } from "@/hooks/useArchitectureGovernance";
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
  History, ClipboardPaste, BarChart3, Trash2, Edit, ChevronDown, ChevronRight,
  Layers, BookOpen, ArrowRight, RefreshCcw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  alto: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medio: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  baixo: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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

// ─── New Prompt Form ───
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
        <DialogHeader>
          <DialogTitle>Registrar Prompt Estrutural</DialogTitle>
        </DialogHeader>
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
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
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
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Criticidade</label>
              <Select value={form.criticality} onValueChange={v => setForm(f => ({ ...f, criticality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITICALITY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data Implementação</label>
              <Input type="date" value={form.implementation_date || ""} onChange={e => setForm(f => ({ ...f, implementation_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tabelas Relacionadas (separar por vírgula)</label>
            <Input value={(form.related_tables || []).join(", ")} onChange={e => setForm(f => ({ ...f, related_tables: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="profiles, ingredients, recipes" />
          </div>
          <div>
            <label className="text-sm font-medium">Arquivos Relacionados (separar por vírgula)</label>
            <Input value={(form.related_files || []).join(", ")} onChange={e => setForm(f => ({ ...f, related_files: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Edge Functions Relacionadas (separar por vírgula)</label>
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

// ─── Prompt Card ───
function PromptCard({ prompt, onUpdate, onDelete }: { prompt: ArchitecturePrompt; onUpdate: (id: string, data: Partial<ArchitecturePrompt>) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICONS[prompt.status as keyof typeof STATUS_ICONS] || XCircle;
  const CatIcon = CATEGORY_ICONS[prompt.category] || Code2;

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
              <div>
                <span className="text-muted-foreground">Categoria:</span>
                <p className="font-medium">{CATEGORY_LABELS[prompt.category]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{STATUS_LABELS[prompt.status]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Implementação:</span>
                <p className="font-medium">{prompt.implementation_date ? format(new Date(prompt.implementation_date), "dd/MM/yyyy") : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Atualizado:</span>
                <p className="font-medium">{format(new Date(prompt.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {prompt.prompt_text && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Prompt Original:</p>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">{prompt.prompt_text}</pre>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prompt.related_tables.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tabelas:</p>
                  <div className="flex flex-wrap gap-1">{prompt.related_tables.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                </div>
              )}
              {prompt.related_edge_functions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Edge Functions:</p>
                  <div className="flex flex-wrap gap-1">{prompt.related_edge_functions.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                </div>
              )}
              {prompt.related_files.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Arquivos:</p>
                  <div className="flex flex-wrap gap-1">{prompt.related_files.map(t => <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>)}</div>
                </div>
              )}
              {prompt.dependencies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dependências:</p>
                  <div className="flex flex-wrap gap-1">{prompt.dependencies.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Select value={prompt.status} onValueChange={v => onUpdate(prompt.id, { status: v })}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => onDelete(prompt.id)} className="text-destructive hover:text-destructive h-8">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Importar Estrutura de Outro Chat
          </CardTitle>
          <CardDescription>Cole a resposta de outro ChatGPT para extrair prompts e decisões arquiteturais automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Cole aqui o conteúdo completo da conversa ou prompt estrutural..."
            rows={10}
          />
          <Button onClick={handleAnalyze} disabled={!text.trim() || loading} className="gap-2">
            <Search className="h-4 w-4" />
            {loading ? "Analisando..." : "Analisar & Comparar"}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatório de Comparação</CardTitle>
            <CardDescription>{extracted.length} prompts extraídos</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">{report}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Dashboard ───
export function ArchitectureGovernanceDashboard() {
  const {
    prompts, history, baseChecks, isLoading, stats,
    createPrompt, updatePrompt, deletePrompt, toggleBaseCheck,
    importFromText, getComplianceReport, refetch,
  } = useArchitectureGovernance();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const compliance = getComplianceReport();
  const overallCompliance = compliance.length > 0
    ? Math.round(compliance.reduce((sum, c) => sum + c.percentage, 0) / compliance.length)
    : 0;

  const blockingPhases = compliance.filter(c => c.isBlocking && !c.allCompleted);
  const saasReady = blockingPhases.length === 0;

  const filtered = prompts.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Prompts</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.implemented}</p>
            <p className="text-xs text-muted-foreground">Implementados</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-amber-600">{stats.partial}</p>
            <p className="text-xs text-muted-foreground">Parciais</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.notImplemented}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold">{overallCompliance}%</p>
            <p className="text-xs text-muted-foreground">Conformidade</p>
          </CardContent>
        </Card>
      </div>

      {/* SaaS Readiness Alert */}
      {!saasReady && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                SaaS NÃO pode ser considerado finalizado
              </p>
              <p className="text-xs text-muted-foreground">
                Fases bloqueantes incompletas: {blockingPhases.map(p => p.name).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" /> Prompts Usados
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" /> Auditoria Técnica
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" /> Arquitetura Base
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Layers className="h-4 w-4" /> Novo SaaS
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardPaste className="h-4 w-4" /> Importar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ── Prompts Usados ── */}
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
            <Card className="bg-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum prompt registrado</p>
                <p className="text-sm mt-1">Registre seus prompts estruturais para rastrear a arquitetura.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <PromptCard key={p.id} prompt={p} onUpdate={updatePrompt} onDelete={deletePrompt} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Auditoria Técnica ── */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Relatório de Risco Estrutural
              </CardTitle>
              <CardDescription>Análise automática de implementação vs prompts registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {prompts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Registre prompts para gerar o relatório de auditoria.</p>
              ) : (
                <div className="space-y-3">
                  {/* By Category */}
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
                        {pct < 50 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {pct >= 50 && pct < 100 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {pct === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    );
                  })}

                  <Separator className="my-4" />

                  {/* High criticality not implemented */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Riscos Críticos (Alta Criticidade Não Implementada)
                    </h4>
                    {prompts.filter(p => p.criticality === "alto" && p.status !== "implementado").length === 0 ? (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Nenhum risco crítico detectado
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {prompts.filter(p => p.criticality === "alto" && p.status !== "implementado").map(p => (
                          <div key={p.id} className="flex items-center gap-2 p-2 rounded bg-red-500/5 border border-red-500/20">
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm">{p.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">{STATUS_LABELS[p.status]}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Comparação com Arquitetura Base ── */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Conformidade com Arquitetura Base
              </CardTitle>
              <CardDescription>Comparação automática do SaaS atual com o modelo obrigatório</CardDescription>
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
                  <Progress value={phase.percentage} className={cn("h-2", phase.isBlocking && phase.percentage < 100 && "[&>div]:bg-red-500")} />
                  <div className="space-y-1 ml-8">
                    {baseChecks.filter(c => c.phase === phase.phase).map(check => (
                      <div key={check.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={check.is_completed}
                          onCheckedChange={(v) => toggleBaseCheck(check.id, !!v)}
                        />
                        <span className={cn("text-sm", check.is_completed && "line-through text-muted-foreground")}>{check.check_name}</span>
                        {check.check_description && (
                          <span className="text-xs text-muted-foreground hidden md:inline">— {check.check_description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Novo SaaS Checklist ── */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Ordem Padrão Obrigatória – Novo SaaS
              </CardTitle>
              <CardDescription>Checklist sequencial. Fases 1 e 3 são bloqueantes e devem estar 100% completas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {compliance.map((phase, idx) => (
                <div key={phase.phase}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      phase.allCompleted
                        ? "bg-green-500/10 text-green-600"
                        : phase.isBlocking
                          ? "bg-red-500/10 text-red-600"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {phase.allCompleted ? <CheckCircle2 className="h-5 w-5" /> : phase.phase}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">FASE {phase.phase} — {phase.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {phase.completed}/{phase.total} completo
                        {phase.isBlocking && " • BLOQUEANTE"}
                      </p>
                    </div>
                    {!phase.allCompleted && idx > 0 && compliance[idx - 1].isBlocking && !compliance[idx - 1].allCompleted && (
                      <Badge variant="outline" className="text-xs ml-auto">Aguardando Fase {compliance[idx - 1].phase}</Badge>
                    )}
                  </div>
                  <div className="ml-5 pl-5 border-l-2 border-muted space-y-2">
                    {baseChecks.filter(c => c.phase === phase.phase).map(check => (
                      <div key={check.id} className="flex items-center gap-3 py-1">
                        {check.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span className={cn("text-sm", check.is_completed && "text-muted-foreground")}>{check.check_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Importar ── */}
        <TabsContent value="import">
          <ImportTab onImport={importFromText} />
        </TabsContent>

        {/* ── Histórico ── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico Estrutural
              </CardTitle>
              <CardDescription>Todas as alterações na arquitetura registradas automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {history.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma alteração registrada ainda</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(h => (
                        <TableRow key={h.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{h.action.replace(/_/g, " ")}</Badge>
                          </TableCell>
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
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
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
