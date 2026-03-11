import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequirePermission } from "@/components/rbac";
import {
  useSupportDashboard,
  SupportTicket,
  TicketStatus,
  TicketType,
  TicketPriority,
} from "@/hooks/useSupportDashboard";
import { useCollaboratorManagement } from "@/hooks/useRBAC";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Bug,
  HelpCircle,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  StickyNote,
  User,
  RefreshCcw,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  ArrowUpCircle,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSP, formatDateTimeBR } from "@/lib/date-utils";

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "bg-amber-500", icon: Clock },
  in_progress: { label: "Em andamento", color: "bg-blue-500", icon: RefreshCcw },
  resolved: { label: "Resolvido", color: "bg-emerald-500", icon: CheckCircle2 },
};

const TYPE_CONFIG: Record<TicketType, { label: string; color: string; icon: any }> = {
  bug: { label: "Bug", color: "bg-red-500", icon: Bug },
  question: { label: "Dúvida", color: "bg-blue-500", icon: HelpCircle },
  payment: { label: "Pagamento", color: "bg-purple-500", icon: CreditCard },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-muted-foreground" },
  normal: { label: "Normal", color: "text-foreground" },
  high: { label: "Alta", color: "text-amber-500" },
  urgent: { label: "Urgente", color: "text-destructive" },
};

export function SupportDashboard() {
  const navigate = useNavigate();
  const {
    tickets,
    selectedTicket,
    setSelectedTicket,
    messages,
    notes,
    isLoading,
    isLoadingMessages,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    ticketStats,
    refetch,
    sendMessage,
    addNote,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
  } = useSupportDashboard();

  const { collaborators } = useCollaboratorManagement();

  const [replyMessage, setReplyMessage] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    await sendMessage(selectedTicket.id, replyMessage);
    setReplyMessage("");
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !noteText.trim()) return;
    await addNote(selectedTicket.id, noteText);
    setNoteText("");
  };

  const handleAccessUserAccount = (userId: string) => {
    // Navigate to user management with impersonation mode
    navigate(`/admin?impersonate=${userId}`);
  };

  return (
    <RequirePermission
      permission="respond_support"
      fallback={
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar a central de suporte.
              </p>
            </div>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{ticketStats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Tickets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">{ticketStats.open}</div>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{ticketStats.in_progress}</div>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">{ticketStats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{ticketStats.urgent}</div>
              <p className="text-xs text-muted-foreground">Urgentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Central de Suporte
                </CardTitle>
                <CardDescription>Gerencie os tickets de suporte dos usuários</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TicketType | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="question">Dúvida</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p>Nenhum ticket encontrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Consentimento</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const TypeIcon = TYPE_CONFIG[ticket.ticket_type as TicketType]?.icon || HelpCircle;
                      const StatusIcon = STATUS_CONFIG[ticket.status as TicketStatus]?.icon || Clock;
                      
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {ticket.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{ticket.user_email}</p>
                              <p className="text-xs text-muted-foreground">
                                {ticket.user_business_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {TYPE_CONFIG[ticket.ticket_type as TicketType]?.label || ticket.ticket_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`gap-1 ${STATUS_CONFIG[ticket.status as TicketStatus]?.color || ""} text-white`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_CONFIG[ticket.status as TicketStatus]?.label || ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={PRIORITY_CONFIG[ticket.priority as TicketPriority]?.color}>
                              {PRIORITY_CONFIG[ticket.priority as TicketPriority]?.label || ticket.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(ticket as any).consent_granted ? (
                              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                                <ShieldCheck className="h-3 w-3" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <ShieldOff className="h-3 w-3" />
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectTicket(ticket)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
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

        {/* Ticket Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {selectedTicket?.subject}
              </DialogTitle>
              <DialogDescription>
                Ticket #{selectedTicket?.id.slice(0, 8)} • {selectedTicket?.user_email}
              </DialogDescription>
            </DialogHeader>

            {selectedTicket && (
              <div className="grid grid-cols-3 gap-4">
                {/* Left Panel - Ticket Info & Actions */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Informações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Usuário</p>
                        <p className="font-medium">{selectedTicket.user_email}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTicket.user_business_name}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(v) =>
                            updateTicketStatus(selectedTicket.id, v as TicketStatus)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em andamento</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
                        <Select
                          value={selectedTicket.priority}
                          onValueChange={(v) =>
                            updateTicketPriority(selectedTicket.id, v as TicketPriority)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Atribuído a</p>
                        <Select
                          value={selectedTicket.assigned_to || "unassigned"}
                          onValueChange={(v) =>
                            assignTicket(selectedTicket.id, v === "unassigned" ? null : v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Ninguém" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Ninguém</SelectItem>
                            {collaborators.map((c) => (
                              <SelectItem key={c.user_id} value={c.user_id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Ações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => handleAccessUserAccount(selectedTicket.user_id)}
                        disabled={!(selectedTicket as any).consent_granted}
                        title={!(selectedTicket as any).consent_granted ? "Usuário não autorizou acesso" : ""}
                      >
                        {(selectedTicket as any).consent_granted ? (
                          <ShieldCheck className="h-4 w-4 mr-2 text-emerald-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4 mr-2" />
                        )}
                        Acessar conta
                      </Button>
                      {selectedTicket.status !== "resolved" && (
                        <Button
                          variant="outline"
                          className="w-full justify-start text-emerald-600"
                          size="sm"
                          onClick={() => updateTicketStatus(selectedTicket.id, "resolved")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar resolvido
                        </Button>
                      )}
                      {selectedTicket.priority !== "urgent" && (
                        <Button
                          variant="outline"
                          className="w-full justify-start text-destructive"
                          size="sm"
                          onClick={() => updateTicketPriority(selectedTicket.id, "urgent")}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          Priorizar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Messages & Notes */}
                <div className="col-span-2">
                  <Tabs defaultValue="messages" className="h-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="messages" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mensagens
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="flex-1">
                        <StickyNote className="h-4 w-4 mr-2" />
                        Notas Internas
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="messages" className="h-[400px] flex flex-col">
                      <ScrollArea className="flex-1 pr-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Original message */}
                            <div className="p-3 rounded-lg bg-muted">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {selectedTicket.user_email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeBR(selectedTicket.created_at)}
                                </span>
                              </div>
                              <p className="text-sm">{selectedTicket.message}</p>
                            </div>

                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-lg ${
                                  msg.sender_type === "admin"
                                    ? "bg-primary/10 ml-8"
                                    : "bg-muted mr-8"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.sender_type === "admin" ? (
                                    <Shield className="h-4 w-4 text-primary" />
                                  ) : (
                                    <User className="h-4 w-4" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {msg.sender_type === "admin" ? "Suporte" : selectedTicket.user_email}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateTimeBR(msg.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Textarea
                          placeholder="Digite sua resposta..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyMessage.trim()}
                          className="self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="h-[400px] flex flex-col">
                      <ScrollArea className="flex-1 pr-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : notes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <StickyNote className="h-8 w-8 mb-2" />
                            <p className="text-sm">Nenhuma nota interna</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div key={note.id} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-1">
                                  <StickyNote className="h-4 w-4 text-amber-600" />
                                  <span className="text-sm font-medium">{note.admin_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm">{note.note}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Textarea
                          placeholder="Adicionar nota interna (visível apenas para administradores)..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button
                          onClick={handleAddNote}
                          disabled={!noteText.trim()}
                          variant="secondary"
                          className="self-end"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
