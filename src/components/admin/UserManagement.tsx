import { useState, useEffect } from "react";
import { useAdminUsers, AdminUser } from "@/hooks/useAdminUsers";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  MoreHorizontal,
  Eye,
  KeyRound,
  CreditCard,
  Calendar,
  MessageSquare,
  UserCog,
  RefreshCcw,
  DollarSign,
  HeadphonesIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Shield,
  ShieldOff,
  Gift,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSP, formatDateBR, formatDateTimeBR } from "@/lib/date-utils";

const STATUS_CONFIG = {
  active: { label: "Ativo", color: "text-emerald-600 border-emerald-600", icon: CheckCircle2 },
  trial: { label: "Trial", color: "text-blue-600 border-blue-600", icon: Clock },
  expired: { label: "Vencido", color: "text-amber-600 border-amber-600", icon: AlertTriangle },
  canceled: { label: "Cancelado", color: "text-destructive border-destructive", icon: XCircle },
};

const PLAN_CONFIG = {
  free: { label: "Gratuito", color: "" },
  basic: { label: "Básico", color: "border-primary text-primary" },
  pro: { label: "Pro", color: "border-emerald-600 text-emerald-600" },
};

const FEATURE_LABELS: Record<string, string> = {
  ai_analysis: "Análise IA",
  combos_ai: "Combos IA",
  ifood_import: "Import iFood",
  menu_analysis: "Análise Cardápio",
  incremental_revenue: "Receita Incremental",
  spreadsheet_import: "Import Planilha",
  sub_recipes: "Sub-receitas",
};

const BONUS_FEATURES = Object.entries(FEATURE_LABELS).map(([value, label]) => ({ value, label }));

interface UserManagementProps {
  onImpersonate?: (userId: string) => void;
}

export function UserManagement({ onImpersonate }: UserManagementProps) {
  const {
    users,
    isLoading,
    selectedUser,
    setSelectedUser,
    userDetails,
    financialHistory,
    supportHistory,
    fetchUsers,
    getUserDetails,
    resetPassword,
    changePlan,
    updateStatus,
    extendSubscription,
    getFinancialHistory,
    getSupportHistory,
    startImpersonation: startImpersonationApi,
    grantCredits,
    getUserCredits,
  } = useAdminUsers();

  const { startImpersonation, isLoading: impersonationLoading } = useImpersonation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [extensionDays, setExtensionDays] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [isGrantCreditsOpen, setIsGrantCreditsOpen] = useState(false);
  const [creditFeature, setCreditFeature] = useState("");
  const [creditAmount, setCreditAmount] = useState(5);
  const [creditReason, setCreditReason] = useState("");
  const [userCredits, setUserCredits] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || user.subscription_status === statusFilter;
    const matchesPlan = planFilter === "all" || user.user_plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    const [, , , credits] = await Promise.all([
      getUserDetails(user.id),
      getFinancialHistory(user.id),
      getSupportHistory(user.id),
      getUserCredits(user.id),
    ]);
    setUserCredits(credits || []);
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !creditFeature || creditAmount <= 0) return;
    setActionLoading(true);
    const result = await grantCredits(selectedUser.id, creditFeature, creditAmount, creditReason || undefined);
    setActionLoading(false);
    if (result !== null) {
      setIsGrantCreditsOpen(false);
      setCreditFeature("");
      setCreditAmount(5);
      setCreditReason("");
      // Refresh credits
      const credits = await getUserCredits(selectedUser.id);
      setUserCredits(credits || []);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    setActionLoading(true);
    const success = await resetPassword(selectedUser.id, newPassword);
    setActionLoading(false);
    if (success) {
      setIsResetPasswordOpen(false);
      setNewPassword("");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedUser || !selectedPlan) return;
    setActionLoading(true);
    const success = await changePlan(selectedUser.id, selectedPlan);
    setActionLoading(false);
    if (success) {
      setIsChangePlanOpen(false);
      setSelectedUser({ ...selectedUser, user_plan: selectedPlan });
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedUser || extensionDays <= 0) return;
    setActionLoading(true);
    const success = await extendSubscription(selectedUser.id, extensionDays);
    setActionLoading(false);
    if (success) {
      setIsExtendOpen(false);
    }
  };

  const handleImpersonate = async (user: AdminUser) => {
    // First call the API to get impersonation data (with consent check)
    const result = await startImpersonationApi(user.id);
    
    if (result && result.targetUser) {
      // Start read-only impersonation session
      await startImpersonation(
        result.targetUser,
        result.adminId,
        result.adminEmail,
        result.sessionToken,
        result.maxDurationMinutes || 30,
        result.consentId || ''
      );
      // Hook handles navigation to /app
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail ou nome do negócio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos planos</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {filteredUsers.length} usuário(s) encontrado(s)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const statusConfig = STATUS_CONFIG[user.subscription_status];
                        const planConfig = PLAN_CONFIG[user.user_plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free;

                        return (
                          <TableRow
                            key={user.id}
                            className={`cursor-pointer ${selectedUser?.id === user.id ? "bg-muted/50" : ""}`}
                            onClick={() => handleSelectUser(user)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.business_name || "Sem nome"}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={planConfig.color}>
                                {planConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {user.last_access_at || user.last_sign_in_at
                                ? formatDistanceToNow(
                                    new Date(user.last_access_at || user.last_sign_in_at!),
                                    { addSuffix: true, locale: ptBR }
                                  )
                                : "Nunca"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {user.subscription_expires_at
                                ? formatDateBR(user.subscription_expires_at)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(user);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleImpersonate(user);
                                  }}>
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Modo suporte
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(user);
                                    setIsResetPasswordOpen(true);
                                  }}>
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    Resetar senha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(user);
                                    setSelectedPlan(user.user_plan);
                                    setIsChangePlanOpen(true);
                                  }}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Alterar plano
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(user);
                                    setIsExtendOpen(true);
                                  }}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Prorrogar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(user);
                                    setIsGrantCreditsOpen(true);
                                  }}>
                                    <Gift className="h-4 w-4 mr-2" />
                                    Conceder Créditos
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Details */}
        <div>
          {selectedUser ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedUser.business_name || "Sem nome"}</CardTitle>
                <CardDescription>{selectedUser.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="financial">Financeiro</TabsTrigger>
                    <TabsTrigger value="support">Suporte</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className={STATUS_CONFIG[selectedUser.subscription_status].color}>
                          {STATUS_CONFIG[selectedUser.subscription_status].label}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Plano:</span>
                        <Badge variant="outline" className={PLAN_CONFIG[selectedUser.user_plan as keyof typeof PLAN_CONFIG]?.color}>
                          {PLAN_CONFIG[selectedUser.user_plan as keyof typeof PLAN_CONFIG]?.label || "Gratuito"}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cadastro:</span>
                        <span>{formatDateBR(selectedUser.created_at)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Último acesso:</span>
                        <span>
                          {selectedUser.last_access_at || selectedUser.last_sign_in_at
                            ? formatDateTimeBR(selectedUser.last_access_at || selectedUser.last_sign_in_at!)
                            : "Nunca"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vencimento:</span>
                        <span>
                          {selectedUser.subscription_expires_at
                            ? format(new Date(selectedUser.subscription_expires_at), "dd/MM/yyyy")
                            : "-"}
                        </span>
                      </div>
                      {userDetails?.stores && (
                        <>
                          <Separator />
                          <div className="text-sm">
                            <span className="text-muted-foreground">Lojas ({userDetails.stores.length}):</span>
                            <div className="mt-1 space-y-1">
                              {userDetails.stores.map((store: any) => (
                                <div key={store.id} className="flex items-center gap-2 text-xs">
                                  <Building2 className="h-3 w-3" />
                                  {store.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bonus Credits Display */}
                    {userCredits.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Gift className="h-3 w-3" /> Créditos Bônus
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {userCredits.map((c: any) => (
                              <Badge key={c.id} variant="outline" className="text-xs border-primary/30 text-primary">
                                {FEATURE_LABELS[c.feature as keyof typeof FEATURE_LABELS] || c.feature}: +{c.credits}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsResetPasswordOpen(true)}
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        Senha
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPlan(selectedUser.user_plan);
                          setIsChangePlanOpen(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Plano
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsExtendOpen(true)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Prorrogar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsGrantCreditsOpen(true)}
                      >
                        <Gift className="h-4 w-4 mr-1" />
                        Créditos
                      </Button>
                      <Button 
                        variant={selectedUser.has_support_consent ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImpersonate(selectedUser)}
                        disabled={!selectedUser.has_support_consent}
                        title={selectedUser.has_support_consent 
                          ? "Acessar conta em modo somente leitura" 
                          : "Usuário não autorizou acesso de suporte"
                        }
                        className={selectedUser.has_support_consent 
                          ? "bg-amber-500 hover:bg-amber-600 text-white" 
                          : ""
                        }
                      >
                        <UserCog className="h-4 w-4 mr-1" />
                        {selectedUser.has_support_consent ? "Modo Suporte" : "Sem Consentimento"}
                      </Button>
                    </div>
                    
                    {/* Consent status indicator */}
                    {selectedUser.has_support_consent ? (
                      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <Shield className="h-3 w-3" />
                          <span>Consentimento ativo até {selectedUser.consent_expires_at 
                            ? format(new Date(selectedUser.consent_expires_at), "dd/MM HH:mm")
                            : "—"
                          }</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 p-2 bg-muted/50 border border-border rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldOff className="h-3 w-3" />
                          <span>Usuário precisa autorizar acesso</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="financial">
                    <div className="space-y-2">
                      {financialHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum pagamento registrado</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {financialHistory.map((payment) => (
                              <div key={payment.id} className="p-2 border rounded-lg text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                  <Badge variant={payment.status === "completed" ? "default" : "outline"}>
                                    {payment.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm")}
                                </p>
                                {payment.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{payment.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="support">
                    <div className="space-y-2">
                      {supportHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <HeadphonesIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum ticket de suporte</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {supportHistory.map((ticket) => (
                              <div key={ticket.id} className="p-2 border rounded-lg text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{ticket.subject}</span>
                                  <Badge variant="outline">{ticket.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {ticket.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Selecione um usuário para ver os detalhes</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                O usuário será obrigado a trocar a senha no próximo login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={actionLoading || !newPassword}>
              {actionLoading ? "Resetando..." : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              Altere o plano de {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teste">Teste - Grátis</SelectItem>
                  <SelectItem value="essencial">Essencial - R$ 97,00/mês</SelectItem>
                  <SelectItem value="pro">Pro - R$ 147,00/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePlanOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={actionLoading}>
              {actionLoading ? "Alterando..." : "Alterar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prorrogar Assinatura</DialogTitle>
            <DialogDescription>
              Estenda a assinatura de {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dias de extensão</Label>
              <Input
                type="number"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                min={1}
                max={365}
              />
              <p className="text-xs text-muted-foreground">
                A data de vencimento será estendida a partir da data atual.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExtendSubscription} disabled={actionLoading || extensionDays <= 0}>
              {actionLoading ? "Prorrogando..." : `Prorrogar ${extensionDays} dias`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Credits Dialog */}
      <Dialog open={isGrantCreditsOpen} onOpenChange={setIsGrantCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Conceder Créditos Bônus
            </DialogTitle>
            <DialogDescription>
              Conceda créditos extras para {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funcionalidade</Label>
              <Select value={creditFeature} onValueChange={setCreditFeature}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a funcionalidade" />
                </SelectTrigger>
                <SelectContent>
                  {BONUS_FEATURES.map((f) => {
                    const existing = userCredits.find((c: any) => c.feature === f.value);
                    return (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label} {existing ? `(atual: +${existing.credits})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade de créditos</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground">
                Os créditos serão somados ao valor existente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Ex: Cortesia por problema técnico"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrantCreditsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrantCredits} disabled={actionLoading || !creditFeature || creditAmount <= 0}>
              {actionLoading ? "Concedendo..." : `Conceder ${creditAmount} crédito(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
