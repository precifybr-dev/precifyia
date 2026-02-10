import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Shield,
  Terminal,
  Activity,
  Link2,
  ChevronDown,
  Search,
  Calendar,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───

type MaturityStatus = "implemented" | "partial" | "planned";

interface CriticalRule {
  description: string;
  scope: "frontend" | "backend" | "security";
}

interface Feature {
  id: string;
  name: string;
  description: string;
  date: string;
  area: string;
  status: MaturityStatus;
  rules: CriticalRule[];
  prompt: string;
  impacts: string[];
  dependencies: string[];
}

// ─── Data ───

const FEATURES: Feature[] = [
  {
    id: "rbac",
    name: "RBAC – Controle de Acesso por Papéis",
    description:
      "Sistema de controle de acesso baseado em funções com papéis MASTER, ADMIN, SUPORTE, FINANCEIRO e ANALISTA. Permissões granulares gerenciadas na tabela role_permissions.",
    date: "2026-01-20",
    area: "Segurança",
    status: "implemented",
    rules: [
      { description: "Frontend NÃO pode definir ou alterar papéis de usuário.", scope: "frontend" },
      { description: "Verificação de papéis sempre via RLS + security definer functions.", scope: "backend" },
      { description: "Apenas MASTER pode criar colaboradores ou alterar permissões.", scope: "security" },
      { description: "Auto-elevação de privilégios bloqueada por triggers no banco.", scope: "security" },
    ],
    prompt:
      "Implementar sistema RBAC com papéis MASTER, ADMIN, SUPORTE, FINANCEIRO e ANALISTA. Permissões granulares por role. Apenas MASTER pode gerenciar colaboradores.",
    impacts: ["Login/Redirecionamento", "Painel Admin", "Colaboradores", "Todas as Edge Functions"],
    dependencies: ["user_roles", "role_permissions", "user_permissions", "collaborators"],
  },
  {
    id: "multi-store",
    name: "Multi-Loja (Multi-Tenant)",
    description:
      "Modelo multi-tenant com papéis owner/admin/viewer por loja. RLS garante isolamento completo entre lojas. Permissões granulares configuráveis por membro.",
    date: "2026-01-25",
    area: "Infraestrutura",
    status: "implemented",
    rules: [
      { description: "Frontend nunca filtra lojas manualmente — RLS faz o isolamento.", scope: "frontend" },
      { description: "Funções can_manage_store e can_write_store validam acesso no backend.", scope: "backend" },
      { description: "Acesso cruzado entre lojas bloqueado por RLS em todas as tabelas de dados.", scope: "security" },
    ],
    prompt:
      "Implementar modelo multi-tenant com papéis owner, admin e viewer. RLS para isolamento completo entre lojas.",
    impacts: ["Ingredientes", "Receitas", "Bebidas", "Sub-receitas", "Custos", "Despesas"],
    dependencies: ["stores", "store_members", "Todas as tabelas com store_id"],
  },
  {
    id: "calculation-versioning",
    name: "Versionamento de Cálculo Financeiro",
    description:
      "Todo cálculo financeiro salva calculation_version e registra snapshot imutável de inputs/outputs. Dados antigos jamais são recalculados com regras novas.",
    date: "2026-02-10",
    area: "Financeiro",
    status: "implemented",
    rules: [
      { description: "Frontend exibe dados do snapshot original, nunca recalcula localmente.", scope: "frontend" },
      { description: "Tabela calculation_history é imutável (trigger bloqueia UPDATE/DELETE).", scope: "backend" },
      { description: "Ao alterar lógica de cálculo, bumpar CALCULATION_VERSION na Edge Function.", scope: "security" },
    ],
    prompt:
      "Implementar versionamento de cálculo financeiro. Toda entidade calculada deve salvar calculation_version. Nunca recalcular dados antigos com regras novas.",
    impacts: ["Precificação de receitas", "Taxas iFood", "Métricas de negócio"],
    dependencies: ["calculation_history", "recipes.calculation_version", "profiles.ifood_calculation_version"],
  },
  {
    id: "plan-features",
    name: "Feature Flags por Plano",
    description:
      "Sistema de flags de funcionalidades vinculado ao plano do usuário (free/basico/pro/owner). Cada Edge Function verifica a flag antes de executar.",
    date: "2026-02-10",
    area: "Planos",
    status: "implemented",
    rules: [
      { description: "Frontend usa hook usePlanFeatures para checar, mas NÃO decide acesso.", scope: "frontend" },
      { description: "Validação real feita via RPC check_plan_feature no backend.", scope: "backend" },
      { description: "Edge Functions retornam 403 com upgrade_required quando bloqueado.", scope: "security" },
    ],
    prompt:
      "Implementar sistema de feature flags por plano. Tabela plan_features com check_plan_feature RPC. Edge Functions verificam antes de executar.",
    impacts: ["Importação planilha", "Importação iFood", "Precificação avançada", "Colaboradores"],
    dependencies: ["plan_features", "profiles.user_plan", "Edge Functions"],
  },
  {
    id: "mfa",
    name: "MFA – Autenticação em Dois Fatores",
    description:
      "Verificação por código enviado por email ao acessar o painel admin. Obrigatório para MASTER e colaboradores com permissões sensíveis.",
    date: "2026-01-28",
    area: "Segurança",
    status: "implemented",
    rules: [
      { description: "Frontend apenas coleta o código — nunca o valida localmente.", scope: "frontend" },
      { description: "Código gerado, enviado e validado exclusivamente pelas Edge Functions.", scope: "backend" },
      { description: "Código expira em 10 minutos. Rate limiting aplicado.", scope: "security" },
    ],
    prompt:
      "Implementar MFA por email para acesso admin. Edge Functions send-mfa-code e verify-mfa-code. Expiração de 10 minutos.",
    impacts: ["Login Admin", "SecurityCheck page"],
    dependencies: ["user_security", "send-mfa-code", "verify-mfa-code"],
  },
  {
    id: "support-impersonation",
    name: "Modo Suporte (Impersonação)",
    description:
      "Permite que colaboradores com permissão 'impersonate_user' visualizem dados de um usuário em modo somente-leitura, com consentimento ativo.",
    date: "2026-02-01",
    area: "Suporte",
    status: "implemented",
    rules: [
      { description: "Frontend intercepta todas as mutações e bloqueia em modo read-only.", scope: "frontend" },
      { description: "Sessão de suporte registrada com IP, user-agent e logs de ações.", scope: "backend" },
      { description: "Requer consentimento ativo do usuário. Sessão expira automaticamente.", scope: "security" },
    ],
    prompt:
      "Implementar modo suporte com impersonação read-only. Requer consentimento do usuário. Logs completos de sessão.",
    impacts: ["ReadOnlyModeInterceptor", "ImpersonationBanner", "SupportDashboard"],
    dependencies: ["support_consent", "support_session_logs", "support_abuse_alerts"],
  },
  {
    id: "recycle-bin",
    name: "Lixeira com Restauração",
    description:
      "Exclusão suave de registros com possibilidade de restauração dentro de 30 dias. Triggers movem dados para deleted_records automaticamente.",
    date: "2026-02-03",
    area: "Dados",
    status: "implemented",
    rules: [
      { description: "Frontend chama soft-delete; nunca exclui permanentemente.", scope: "frontend" },
      { description: "Trigger move dados para deleted_records com expiração de 30 dias.", scope: "backend" },
      { description: "RLS garante que usuários só veem seus próprios itens excluídos.", scope: "security" },
    ],
    prompt:
      "Implementar lixeira com soft-delete. Tabela deleted_records com expiração de 30 dias. Restauração preserva dados originais.",
    impacts: ["Ingredientes", "Receitas", "Bebidas", "Sub-receitas"],
    dependencies: ["deleted_records", "RecycleBin page"],
  },
  {
    id: "ifood-import",
    name: "Importação de Cardápio iFood",
    description:
      "Parse do HTML do cardápio público do iFood para extrair itens e preços. Vincula automaticamente a ingredientes existentes.",
    date: "2026-02-05",
    area: "Dados",
    status: "implemented",
    rules: [
      { description: "Frontend envia URL; parsing feito exclusivamente no backend.", scope: "frontend" },
      { description: "Edge Function parse-ifood-menu faz scraping e normalização.", scope: "backend" },
      { description: "Rate limiting e feature flag aplicados. Logs de uso registrados.", scope: "security" },
    ],
    prompt:
      "Implementar importação de cardápio iFood. Parse HTML da URL pública. Extrair nome, preço e categoria dos itens.",
    impacts: ["Bebidas", "Receitas"],
    dependencies: ["parse-ifood-menu", "ifood_import_usage", "plan_features"],
  },
  {
    id: "spreadsheet-import",
    name: "Importação via Planilha",
    description:
      "Análise inteligente de colunas de planilha para mapeamento automático e importação em lote de ingredientes.",
    date: "2026-02-06",
    area: "Dados",
    status: "implemented",
    rules: [
      { description: "Frontend envia dados brutos; mapeamento feito no backend.", scope: "frontend" },
      { description: "Edge Function analyze-spreadsheet-columns usa heurísticas para mapear.", scope: "backend" },
      { description: "Validação de limites do plano antes da importação.", scope: "security" },
    ],
    prompt:
      "Implementar importação de ingredientes via planilha com análise inteligente de colunas.",
    impacts: ["Ingredientes"],
    dependencies: ["analyze-spreadsheet-columns", "plan_features"],
  },
  {
    id: "financial-dashboard",
    name: "Dashboard Financeiro Admin",
    description:
      "Painel com MRR, ARPU, receita por plano, links de pagamento, renovações e projeções financeiras.",
    date: "2026-02-07",
    area: "Financeiro",
    status: "implemented",
    rules: [
      { description: "Frontend exibe dados calculados; nunca computa MRR localmente.", scope: "frontend" },
      { description: "Funções RPC (get_financial_summary, get_mrr_stats, etc.) calculam no banco.", scope: "backend" },
      { description: "Acesso restrito a roles com permissão view_financials.", scope: "security" },
    ],
    prompt:
      "Implementar dashboard financeiro admin com MRR, ARPU, receita por plano e projeções.",
    impacts: ["Painel Admin (seção Financeiro)"],
    dependencies: ["admin_metrics", "payment_links", "user_payments"],
  },
  {
    id: "audit-logging",
    name: "Auditoria e Logs de Acesso",
    description:
      "Registro completo de ações administrativas, acessos e modificações de dados com IP e user-agent.",
    date: "2026-02-02",
    area: "Segurança",
    status: "implemented",
    rules: [
      { description: "Frontend registra eventos via hook useAccessLogger.", scope: "frontend" },
      { description: "Edge Function log-access persiste com metadados completos.", scope: "backend" },
      { description: "Logs são append-only. Auditoria admin separada em admin_audit_logs.", scope: "security" },
    ],
    prompt:
      "Implementar sistema de auditoria com logs de acesso, ações admin e modificações de dados.",
    impacts: ["Todas as ações admin", "Login/Logout", "Modificações de dados"],
    dependencies: ["access_logs", "admin_audit_logs", "data_audit_log", "log-access"],
  },
  {
    id: "onboarding",
    name: "Onboarding Guiado",
    description:
      "Fluxo de onboarding em etapas para configuração inicial do negócio, ingredientes e primeira receita.",
    date: "2026-01-22",
    area: "UX",
    status: "implemented",
    rules: [
      { description: "Frontend navega pelas etapas; estado salvo no perfil do usuário.", scope: "frontend" },
      { description: "Campo onboarding_step no profiles controla a etapa atual.", scope: "backend" },
      { description: "Usuário não pode acessar o app sem completar o onboarding.", scope: "security" },
    ],
    prompt:
      "Implementar onboarding em etapas: configuração do negócio, cadastro de ingredientes e criação da primeira receita.",
    impacts: ["Primeira experiência do usuário", "Dashboard"],
    dependencies: ["profiles.onboarding_step", "Onboarding page"],
  },
  {
    id: "rate-limiting",
    name: "Rate Limiting",
    description:
      "Controle de taxa de requisições por endpoint com bloqueio temporário. Previne abuso de APIs sensíveis.",
    date: "2026-02-04",
    area: "Segurança",
    status: "implemented",
    rules: [
      { description: "Frontend não implementa rate limiting — apenas o backend.", scope: "frontend" },
      { description: "Função check_rate_limit no banco com janela deslizante.", scope: "backend" },
      { description: "Bloqueio temporário retorna retry_after_seconds ao cliente.", scope: "security" },
    ],
    prompt:
      "Implementar rate limiting no banco com check_rate_limit. Janela deslizante configurável por endpoint.",
    impacts: ["MFA", "Login", "APIs sensíveis"],
    dependencies: ["rate_limit_entries", "check_rate_limit"],
  },
  {
    id: "event-tracking",
    name: "Rastreamento de Eventos",
    description:
      "Tracking de eventos de uso da plataforma para análise de comportamento e métricas de engajamento.",
    date: "2026-02-06",
    area: "Métricas",
    status: "implemented",
    rules: [
      { description: "Frontend emite eventos via useEventTracking; não processa analytics.", scope: "frontend" },
      { description: "Dados agregados por funções RPC (get_daily_active_users, etc.).", scope: "backend" },
      { description: "Dados anonimizados para métricas; acesso restrito a roles com view_metrics.", scope: "security" },
    ],
    prompt:
      "Implementar rastreamento de eventos de uso com categorização e métricas de engajamento.",
    impacts: ["Métricas Admin", "Dashboard de Uso"],
    dependencies: ["platform_events", "user_sessions"],
  },
];

// ─── Helpers ───

const statusConfig: Record<MaturityStatus, { label: string; color: string }> = {
  implemented: { label: "Implementado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  partial: { label: "Parcial", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  planned: { label: "Planejado", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const scopeConfig: Record<string, { label: string; color: string }> = {
  frontend: { label: "Frontend", color: "bg-sky-500/10 text-sky-600" },
  backend: { label: "Backend", color: "bg-violet-500/10 text-violet-600" },
  security: { label: "Segurança", color: "bg-rose-500/10 text-rose-600" },
};

const areaColors: Record<string, string> = {
  Segurança: "bg-rose-500/10 text-rose-600",
  Infraestrutura: "bg-indigo-500/10 text-indigo-600",
  Financeiro: "bg-amber-500/10 text-amber-600",
  Planos: "bg-emerald-500/10 text-emerald-600",
  Suporte: "bg-green-500/10 text-green-600",
  Dados: "bg-cyan-500/10 text-cyan-600",
  UX: "bg-pink-500/10 text-pink-600",
  Métricas: "bg-purple-500/10 text-purple-600",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Feature Card ───

function FeatureCard({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const st = statusConfig[feature.status];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border transition-shadow hover:shadow-md">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold leading-tight">
                  {feature.name}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {feature.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", st.color)}>
                    {st.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", areaColors[feature.area] || "")}>
                    <Tag className="h-3 w-3 mr-1" />
                    {feature.area}
                  </Badge>
                  <span className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(feature.date)}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform shrink-0 mt-1",
                  open && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5">
            <Separator />

            {/* Rules */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-destructive" />
                Regras Críticas
              </h4>
              <div className="space-y-1.5">
                {feature.rules.map((rule, i) => {
                  const sc = scopeConfig[rule.scope];
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", sc.color)}>
                        {sc.label}
                      </Badge>
                      <span className="text-muted-foreground">{rule.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-primary" />
                Prompt Utilizado
              </h4>
              <pre className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono border">
                {feature.prompt}
              </pre>
            </div>

            {/* Impacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Impacto no Sistema
                </h4>
                <ul className="space-y-1">
                  {feature.impacts.map((imp, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-blue-500" />
                  Dependências
                </h4>
                <ul className="space-y-1">
                  {feature.dependencies.map((dep, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{dep}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Summary Table ───

function SummaryTable({ features }: { features: Feature[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-center">Regras</TableHead>
            <TableHead className="text-center">Deps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((f) => {
            const st = statusConfig[f.status];
            return (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-sm max-w-[250px] truncate">{f.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", areaColors[f.area] || "")}>
                    {f.area}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", st.color)}>{st.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(f.date)}
                </TableCell>
                <TableCell className="text-center text-sm">{f.rules.length}</TableCell>
                <TableCell className="text-center text-sm">{f.dependencies.length}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ───

export default function SystemBook() {
  const [search, setSearch] = useState("");

  const areas = [...new Set(FEATURES.map((f) => f.area))];

  const filtered = FEATURES.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.area.toLowerCase().includes(q) ||
      f.prompt.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: FEATURES.length,
    implemented: FEATURES.filter((f) => f.status === "implemented").length,
    partial: FEATURES.filter((f) => f.status === "partial").length,
    planned: FEATURES.filter((f) => f.status === "planned").length,
  };

  return (
    <AdminLayout activeSection="system-book">
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Livro do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                Documentação viva de todas as funcionalidades implementadas
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Implementado", value: stats.implemented, color: "text-emerald-600" },
            { label: "Parcial", value: stats.partial, color: "text-amber-600" },
            { label: "Planejado", value: stats.planned, color: "text-blue-600" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar feature, área ou prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cards">
          <TabsList>
            <TabsTrigger value="cards">Detalhado</TabsTrigger>
            <TabsTrigger value="table">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-4 space-y-4">
            {areas.map((area) => {
              const areaFeatures = filtered.filter((f) => f.area === area);
              if (areaFeatures.length === 0) return null;
              return (
                <div key={area}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {area}
                  </h3>
                  <div className="space-y-3">
                    {areaFeatures.map((f) => (
                      <FeatureCard key={f.id} feature={f} />
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Nenhuma feature encontrada para "{search}".
              </p>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <SummaryTable features={filtered} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
