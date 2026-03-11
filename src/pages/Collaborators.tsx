import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC, useCollaboratorManagement, AppRole, AppPermission } from "@/hooks/useRBAC";
import { RequirePermission } from "@/components/rbac";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
  CheckCircle2, XCircle, AlertTriangle, User, Settings
} from "lucide-react";
import { 
  roleLabels, 
  roleColors, 
  assignableRoles, 
  permissionLabels, 
  permissionCategories,
  allPermissions,
  defaultRolePermissions
} from "@/lib/permissions";
import { formatDateSP } from "@/lib/date-utils";

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

  const getRoleBadgeStyle = (role: AppRole) => {
    switch (role) {
      case "master": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "suporte": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "financeiro": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "analista": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      default: return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  if (rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequirePermission permission="manage_collaborators" fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
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
            <Button onClick={() => navigate("/admin")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <AdminLayout>
        <AdminHeader
          title="Gerenciamento de Colaboradores"
          subtitle="Gerencie os colaboradores e permissões da plataforma"
          icon={<UserCog className="h-6 w-6" />}
          actions={
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                role === "suporte" ? "bg-green-500" :
                                role === "financeiro" ? "bg-amber-500" :
                                "bg-cyan-500"
                              }`} />
                              {roleLabels[role]}
                            </div>
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

                  {/* Permissions Preview for Selected Role */}
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Permissões do papel "{roleLabels[newRole]}"
                    </Label>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {Object.entries(permissionCategories).map(([key, category]) => {
                        const rolePerms = defaultRolePermissions[newRole] || [];
                        const categoryPerms = category.permissions.filter(p => rolePerms.includes(p));
                        
                        if (categoryPerms.length === 0) return null;
                        
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {category.label}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {categoryPerms.map(perm => (
                                <Badge key={perm} variant="secondary" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                                  {permissionLabels[perm]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show what's NOT included */}
                      {(() => {
                        const rolePerms = defaultRolePermissions[newRole] || [];
                        const missingPerms = allPermissions.filter(p => !rolePerms.includes(p));
                        if (missingPerms.length === 0) return null;
                        
                        return (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Sem acesso a:</p>
                            <div className="flex flex-wrap gap-1">
                              {missingPerms.map(perm => (
                                <Badge key={perm} variant="outline" className="text-xs text-muted-foreground">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {permissionLabels[perm]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você pode adicionar ou remover permissões individuais após criar o colaborador.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCollaborator} disabled={creating}>
                    {creating ? (
                      <>
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Colaborador"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Collaborators List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Colaboradores ({visibleCollaborators.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1 p-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : visibleCollaborators.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>Nenhum colaborador cadastrado</p>
                      </div>
                    ) : (
                      visibleCollaborators.map((collaborator) => (
                        <div
                          key={collaborator.id}
                          onClick={() => handleSelectCollaborator(collaborator)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedCollaborator?.id === collaborator.id
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              collaborator.is_active
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              <User className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{collaborator.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{collaborator.email}</p>
                            </div>
                            {!collaborator.is_active && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge className={`${getRoleBadgeStyle(collaborator.role)} border`}>
                              {roleLabels[collaborator.role]}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Collaborator Details */}
            <Card className="lg:col-span-2">
              {selectedCollaborator ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          selectedCollaborator.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedCollaborator.name}</CardTitle>
                          <CardDescription>{selectedCollaborator.email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="active" className="text-sm text-muted-foreground">
                          Ativo
                        </Label>
                        <Switch
                          id="active"
                          checked={selectedCollaborator.is_active}
                          onCheckedChange={() => handleToggleActive(selectedCollaborator)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="permissions" className="space-y-4">
                      <TabsList className="bg-muted/50">
                        <TabsTrigger value="permissions" className="gap-2">
                          <Shield className="h-4 w-4" />
                          Permissões
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                          <KeyRound className="h-4 w-4" />
                          Segurança
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="gap-2">
                          <History className="h-4 w-4" />
                          Histórico
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="permissions" className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Papel do Colaborador</Label>
                            <Select
                              value={selectedCollaborator.role}
                              onValueChange={(v) => handleRoleChange(selectedCollaborator, v as AppRole)}
                            >
                              <SelectTrigger className="w-[180px]">
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
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Permissões Adicionais</Label>
                          <p className="text-xs text-muted-foreground">
                            Conceda permissões extras além das incluídas no papel
                          </p>

                          <div className="grid gap-4">
                            {Object.entries(permissionCategories).map(([key, category]) => (
                              <Card key={key} className="bg-muted/30">
                                <CardHeader className="pb-2 pt-4 px-4">
                                  <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {category.permissions.map((permission) => {
                                      const hasPermission = userPermissions.some(p => p.permission === permission);
                                      return (
                                        <div
                                          key={permission}
                                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                                        >
                                          <Checkbox
                                            id={permission}
                                            checked={hasPermission}
                                            onCheckedChange={() => handleTogglePermission(permission)}
                                          />
                                          <Label
                                            htmlFor={permission}
                                            className="text-sm font-normal cursor-pointer"
                                          >
                                            {permissionLabels[permission]}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="security" className="space-y-4">
                        <div className="grid gap-4">
                          <Card className="bg-muted/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Senha
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-3">
                                Gere uma nova senha temporária para o colaborador
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => handleResetPassword(selectedCollaborator)}
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Resetar Senha
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Autenticação em Dois Fatores
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-3">
                                Resete o 2FA caso o colaborador perca acesso
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => handleReset2FA(selectedCollaborator)}
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Resetar 2FA
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="logs">
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Histórico de Acessos</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ScrollArea className="h-[300px]">
                              {logsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : accessLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                  <p>Nenhum log encontrado</p>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Ação</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Data</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {accessLogs.map((log) => (
                                      <TableRow key={log.id}>
                                        <TableCell className="font-medium text-sm">
                                          {log.action}
                                        </TableCell>
                                        <TableCell>
                                          {log.success ? (
                                            <Badge className="bg-success/10 text-success border-0">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              OK
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-destructive/10 text-destructive border-0">
                                              <XCircle className="h-3 w-3 mr-1" />
                                              Falha
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                          {formatDateSP(log.created_at, "dd/MM HH:mm")}
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
                  </CardContent>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                  <Settings className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Selecione um colaborador</p>
                  <p className="text-sm">Clique em um colaborador para ver os detalhes</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </AdminLayout>
    </RequirePermission>
  );
}
