import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC, useCollaboratorManagement, AppRole, AppPermission } from "@/hooks/useRBAC";
import { RequirePermission } from "@/components/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Users, Plus, Shield, History, KeyRound, UserCog, 
  ArrowLeft, Mail, Lock, Eye, EyeOff, RefreshCcw,
  CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { 
  roleLabels, 
  roleColors, 
  assignableRoles, 
  permissionLabels, 
  permissionCategories,
  allPermissions 
} from "@/lib/permissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Collaborator {
  id: string;
  user_id: string;
  role: AppRole;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AccessLog {
  id: string;
  action: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface UserPermission {
  id: string;
  permission: AppPermission;
  granted_by: string | null;
  created_at: string;
}

const MASTER_EMAIL = "precify.br@gmail.com";

export default function Collaborators() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { isMaster, isLoading: rbacLoading } = useRBAC(userId);
  const { 
    collaborators, 
    isLoading, 
    refetch, 
    createCollaborator,
    grantPermission,
    revokePermission
  } = useCollaboratorManagement();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("suporte");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  // Filter out master email from collaborators list
  const visibleCollaborators = collaborators.filter(c => c.email !== MASTER_EMAIL);

  const handleCreateCollaborator = async () => {
    if (!newEmail || !newName || !newPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const result = await createCollaborator(newEmail, newName, newRole, newPassword);
    setCreating(false);

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Colaborador criado com sucesso!",
      });
      setIsCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("suporte");
      
      // Log the action
      await logAction("create_collaborator", { email: newEmail, role: newRole });
    } else {
      toast({
        title: "Erro",
        description: result.error || "Erro ao criar colaborador",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (collaborator: Collaborator) => {
    try {
      const { error } = await supabase.functions.invoke("manage-collaborator", {
        body: {
          action: "update",
          collaboratorId: collaborator.id,
          updates: { is_active: !collaborator.is_active }
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: collaborator.is_active ? "Colaborador desativado" : "Colaborador ativado",
      });
      
      await logAction(collaborator.is_active ? "deactivate_collaborator" : "activate_collaborator", {
        collaborator_id: collaborator.id,
        email: collaborator.email
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar colaborador",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (collaborator: Collaborator, newRole: AppRole) => {
    try {
      const { error } = await supabase.functions.invoke("manage-collaborator", {
        body: {
          action: "update",
          collaboratorId: collaborator.id,
          updates: { role: newRole }
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Papel atualizado com sucesso",
      });
      
      await logAction("change_role", {
        collaborator_id: collaborator.id,
        old_role: collaborator.role,
        new_role: newRole
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar papel",
        variant: "destructive",
      });
    }
  };

  const handleReset2FA = async (collaborator: Collaborator) => {
    try {
      const { error } = await supabase.functions.invoke("manage-collaborator", {
        body: {
          action: "reset_2fa",
          userId: collaborator.user_id
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "2FA resetado com sucesso. O usuário precisará configurar novamente.",
      });
      
      await logAction("reset_2fa", {
        collaborator_id: collaborator.id,
        email: collaborator.email
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar 2FA",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (collaborator: Collaborator) => {
    const tempPassword = generateTempPassword();
    
    try {
      const { error } = await supabase.functions.invoke("manage-collaborator", {
        body: {
          action: "reset_password",
          userId: collaborator.user_id,
          newPassword: tempPassword
        }
      });

      if (error) throw error;

      toast({
        title: "Senha resetada",
        description: `Nova senha temporária: ${tempPassword}`,
      });
      
      await logAction("reset_password", {
        collaborator_id: collaborator.id,
        email: collaborator.email
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar senha",
        variant: "destructive",
      });
    }
  };

  const loadAccessLogs = async (collaborator: Collaborator) => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("user_id", collaborator.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAccessLogs((data || []) as AccessLog[]);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadUserPermissions = async (collaborator: Collaborator) => {
    setPermissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", collaborator.user_id);

      if (error) throw error;
      setUserPermissions(data || []);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleSelectCollaborator = async (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    await Promise.all([
      loadAccessLogs(collaborator),
      loadUserPermissions(collaborator)
    ]);
  };

  const handleTogglePermission = async (permission: AppPermission) => {
    if (!selectedCollaborator || !userId) return;

    const hasPermission = userPermissions.some(p => p.permission === permission);

    if (hasPermission) {
      const result = await revokePermission(selectedCollaborator.user_id, permission);
      if (result.success) {
        toast({ title: "Permissão removida" });
        await logAction("revoke_permission", {
          collaborator_id: selectedCollaborator.id,
          permission
        });
      }
    } else {
      const result = await grantPermission(selectedCollaborator.user_id, permission, userId);
      if (result.success) {
        toast({ title: "Permissão concedida" });
        await logAction("grant_permission", {
          collaborator_id: selectedCollaborator.id,
          permission
        });
      }
    }

    loadUserPermissions(selectedCollaborator);
  };

  const logAction = async (action: string, metadata: Record<string, any>) => {
    if (!userId) return;
    try {
      await supabase.functions.invoke("log-access", {
        body: { action, metadata, success: true }
      });
    } catch (error) {
      console.error("Erro ao registrar ação:", error);
    }
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequirePermission permission="manage_collaborators" fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Gerenciamento de Colaboradores
                </h1>
                <p className="text-muted-foreground">
                  Gerencie os colaboradores da plataforma
                </p>
              </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Colaborador</DialogTitle>
                  <DialogDescription>
                    Adicione um novo colaborador à plataforma
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do colaborador"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Papel</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha inicial</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O colaborador será obrigado a trocar a senha no primeiro acesso
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCollaborator} disabled={creating}>
                    {creating ? "Criando..." : "Criar Colaborador"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Collaborators List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Colaboradores</CardTitle>
                  <CardDescription>
                    {visibleCollaborators.length} colaborador(es) cadastrado(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : visibleCollaborators.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum colaborador cadastrado</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {visibleCollaborators.map((collaborator) => (
                          <div
                            key={collaborator.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedCollaborator?.id === collaborator.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => handleSelectCollaborator(collaborator)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-medium">{collaborator.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {collaborator.email}
                                </p>
                                <Badge className={roleColors[collaborator.role]}>
                                  {roleLabels[collaborator.role]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {collaborator.is_active ? (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400">
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Collaborator Details */}
            <div className="lg:col-span-2">
              {selectedCollaborator ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedCollaborator.name}</CardTitle>
                        <CardDescription>{selectedCollaborator.email}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ativo</span>
                        <Switch
                          checked={selectedCollaborator.is_active}
                          onCheckedChange={() => handleToggleActive(selectedCollaborator)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="permissions">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="permissions">
                          <Shield className="h-4 w-4 mr-2" />
                          Permissões
                        </TabsTrigger>
                        <TabsTrigger value="security">
                          <KeyRound className="h-4 w-4 mr-2" />
                          Segurança
                        </TabsTrigger>
                        <TabsTrigger value="logs">
                          <History className="h-4 w-4 mr-2" />
                          Histórico
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="permissions" className="mt-4 space-y-6">
                        {/* Role Selection */}
                        <div className="space-y-2">
                          <Label>Papel do Colaborador</Label>
                          <Select
                            value={selectedCollaborator.role}
                            onValueChange={(v) => handleRoleChange(selectedCollaborator, v as AppRole)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {roleLabels[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            O papel define as permissões básicas do colaborador
                          </p>
                        </div>

                        <Separator />

                        {/* Individual Permissions */}
                        <div className="space-y-4">
                          <div>
                            <Label>Permissões Individuais</Label>
                            <p className="text-xs text-muted-foreground">
                              Adicione ou remova permissões específicas para este colaborador
                            </p>
                          </div>

                          {permissionsLoading ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {Object.entries(permissionCategories).map(([key, category]) => (
                                <div key={key} className="space-y-2">
                                  <Label className="text-sm font-medium">{category.label}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {category.permissions.map((permission) => {
                                      const hasPermission = userPermissions.some(
                                        (p) => p.permission === permission
                                      );
                                      return (
                                        <div
                                          key={permission}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            id={permission}
                                            checked={hasPermission}
                                            onCheckedChange={() => handleTogglePermission(permission)}
                                          />
                                          <label
                                            htmlFor={permission}
                                            className="text-sm cursor-pointer"
                                          >
                                            {permissionLabels[permission]}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="security" className="mt-4 space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              Senha
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button
                              variant="outline"
                              onClick={() => handleResetPassword(selectedCollaborator)}
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Uma nova senha temporária será gerada. O colaborador será obrigado a trocá-la no próximo login.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Autenticação de 2 Fatores (2FA)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button
                              variant="outline"
                              onClick={() => handleReset2FA(selectedCollaborator)}
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Resetar 2FA
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Isso desativará o 2FA do colaborador. Ele precisará configurar novamente no próximo login.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <UserCog className="h-4 w-4" />
                              Informações da Conta
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Criado em:</span>
                              <span>
                                {format(new Date(selectedCollaborator.created_at), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">User ID:</span>
                              <span className="font-mono text-xs">
                                {selectedCollaborator.user_id.slice(0, 8)}...
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="logs" className="mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Histórico de Acessos</CardTitle>
                            <CardDescription>
                              Últimos 50 registros de acesso
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {logsLoading ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              </div>
                            ) : accessLogs.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhum registro de acesso encontrado</p>
                              </div>
                            ) : (
                              <ScrollArea className="h-[300px]">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Ação</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>IP</TableHead>
                                      <TableHead>Data/Hora</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {accessLogs.map((log) => (
                                      <TableRow key={log.id}>
                                        <TableCell className="font-medium">
                                          {log.action}
                                        </TableCell>
                                        <TableCell>
                                          {log.success ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-destructive" />
                                          )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                          {log.ip_address || "-"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                                            locale: ptBR,
                                          })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </ScrollArea>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <UserCog className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Selecione um colaborador</p>
                    <p className="text-sm">
                      Clique em um colaborador na lista para ver e editar os detalhes
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
