import { useState, useEffect, useCallback } from "react";
import { AdminSecurityGate } from "@/components/admin/AdminSecurityGate";
import { RequirePermission } from "@/components/rbac";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Download, Users, Database, HardDrive, Zap, KeyRound, ScrollText,
  Activity, Shield, ArrowLeft, CheckCircle2, AlertTriangle, Loader2,
  Copy, Code2, RefreshCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

interface ExportModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const EXPORT_MODULES: ExportModule[] = [
  { id: "users", name: "Usuários", description: "ID, email, plano, status da assinatura e data de criação.", icon: Users },
  { id: "database", name: "Database", description: "Estrutura de tabelas, esquemas e contagem de registros.", icon: Database },
  { id: "storage", name: "Storage", description: "Arquivos nos buckets: nome, tamanho e data de upload.", icon: HardDrive },
  { id: "edge_functions", name: "Edge Functions", description: "Funções backend registradas e seu status.", icon: Zap },
  { id: "secrets", name: "Secrets", description: "Nomes e status dos segredos (sem valores reais).", icon: KeyRound },
  { id: "logs", name: "Logs de Acesso", description: "Logs anonimizados de acesso e ações no sistema.", icon: ScrollText },
  { id: "platform_events", name: "Eventos da Plataforma", description: "Eventos de uso e interação dos usuários.", icon: Activity },
  { id: "support_tickets", name: "Tickets de Suporte", description: "Tickets: assunto, categoria, prioridade e status.", icon: Shield },
];

type ExportStatus = "idle" | "loading" | "success" | "error";

export default function AdminExport() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, ExportStatus>>({});
  const [confirmModule, setConfirmModule] = useState<string | null>(null);
  const [schemaSQL, setSchemaSQL] = useState<string>("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);

  const setModuleStatus = (moduleId: string, status: ExportStatus) => {
    setStatuses((prev) => ({ ...prev, [moduleId]: status }));
  };

  const handleExport = async (moduleId: string) => {
    setConfirmModule(null);
    setModuleStatus(moduleId, "loading");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        setModuleStatus(moduleId, "error");
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-export`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ module: moduleId }),
      });

      if (response.status === 429) {
        const data = await response.json();
        toast({
          title: "Limite de exportações atingido",
          description: `Tente novamente em ${data.retry_after_seconds || 30} segundos.`,
          variant: "destructive",
        });
        setModuleStatus(moduleId, "error");
        return;
      }

      if (response.status === 403) {
        toast({ title: "Acesso negado", description: "Você não tem permissão para exportar dados.", variant: "destructive" });
        setModuleStatus(moduleId, "error");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro na exportação");
      }

      const recordCount = response.headers.get("X-Record-Count") || "0";
      const blob = await response.blob();
      const moduleDef = EXPORT_MODULES.find((m) => m.id === moduleId);
      const filename = `export_${moduleId}_${new Date().toISOString().slice(0, 10)}.csv`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setModuleStatus(moduleId, "success");
      toast({
        title: "Exportação concluída",
        description: `${moduleDef?.name}: ${recordCount} registros exportados.`,
      });

      setTimeout(() => setModuleStatus(moduleId, "idle"), 5000);
    } catch (error: any) {
      console.error("Export error:", error);
      setModuleStatus(moduleId, "error");
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados. Tente novamente.",
        variant: "destructive",
      });
      setTimeout(() => setModuleStatus(moduleId, "idle"), 5000);
    }
  };

  const handleLoadSchema = useCallback(async () => {
    setSchemaLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        setSchemaLoading(false);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-export`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ module: "schema_sql" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao carregar schema");
      }

      const text = await response.text();
      setSchemaSQL(text);
      toast({ title: "Schema SQL carregado", description: "O SQL completo das tabelas está pronto para copiar." });
    } catch (error: any) {
      console.error("Schema load error:", error);
      toast({ title: "Erro ao carregar schema", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSchemaLoading(false);
    }
  }, [toast]);

  // Auto-load schema on mount
  useEffect(() => {
    handleLoadSchema();
  }, [handleLoadSchema]);

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(schemaSQL);
      setSchemaCopied(true);
      toast({ title: "SQL copiado!", description: "O schema completo foi copiado para a área de transferência." });
      setTimeout(() => setSchemaCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar. Selecione o texto manualmente.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case "loading":
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Exportando...</Badge>;
      case "success":
        return <Badge className="gap-1 bg-success/10 text-success border-success/20 hover:bg-success/20"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Erro</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminSecurityGate>
      <RequirePermission
        permission="view_metrics"
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Acesso Negado
                </CardTitle>
                <CardDescription>Você não tem permissão para exportar dados.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/admin")} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      >
        <AdminLayout activeSection="export">
          <AdminHeader
            title="Exportação Completa de Dados"
            subtitle="Exporte os dados estruturados do sistema em formato CSV para auditoria, backup ou análise externa."
            icon={<Download className="h-6 w-6" />}
          />

          <div className="p-6 space-y-8">
            {/* ── Export Cards ────────────────────────────────────── */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Exportação CSV por Módulo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {EXPORT_MODULES.map((mod) => {
                  const status = statuses[mod.id] || "idle";
                  const Icon = mod.icon;

                  return (
                    <Card key={mod.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-base">{mod.name}</CardTitle>
                          </div>
                          {getStatusBadge(status)}
                        </div>
                        <CardDescription className="mt-2">{mod.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto pt-0">
                        <Button
                          onClick={() => setConfirmModule(mod.id)}
                          disabled={status === "loading"}
                          className="w-full gap-2"
                          variant={status === "success" ? "outline" : "default"}
                        >
                          {status === "loading" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {status === "loading" ? "Exportando..." : "Exportar CSV"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* ── SQL Schema Section (below CSV) ─────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Code2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">SQL das Tabelas (Migração)</CardTitle>
                      <CardDescription>
                        SQL completo (CREATE TABLE) de todas as tabelas do sistema para copiar e migrar.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {schemaSQL && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleCopySchema}
                      >
                        {schemaCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {schemaCopied ? "Copiado!" : "Copiar SQL"}
                      </Button>
                    )}
                    <Button
                      onClick={handleLoadSchema}
                      disabled={schemaLoading}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {schemaLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      {schemaLoading ? "Carregando..." : "Atualizar"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {schemaLoading && !schemaSQL ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando SQL das tabelas...
                  </div>
                ) : schemaSQL ? (
                  <div className="relative">
                    <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-auto max-h-[500px] whitespace-pre-wrap break-words border">
                      {schemaSQL}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Nenhum schema carregado. Clique em "Atualizar" para gerar.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AdminLayout>

        {/* Confirmation dialog */}
        <AlertDialog open={!!confirmModule} onOpenChange={(open) => !open && setConfirmModule(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exportação</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja exportar esses dados? Esta ação será registrada para fins de auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmModule && handleExport(confirmModule)}>
                Exportar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </RequirePermission>
    </AdminSecurityGate>
  );
}
