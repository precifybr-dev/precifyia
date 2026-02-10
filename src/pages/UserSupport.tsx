import { useState } from "react";
import { useUserSupport, UserTicket, TicketType, TicketStatus } from "@/hooks/useUserSupport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  RefreshCcw,
  Send,
  Plus,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  User,
  Headphones,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: any; className: string }> = {
  open: { label: "Aberto", icon: Clock, className: "bg-amber-500 text-white" },
  in_progress: { label: "Em andamento", icon: RefreshCcw, className: "bg-blue-500 text-white" },
  resolved: { label: "Resolvido", icon: CheckCircle2, className: "bg-emerald-500 text-white" },
};

const TYPE_CONFIG: Record<TicketType, { label: string; icon: any }> = {
  bug: { label: "Bug / Problema", icon: Bug },
  question: { label: "Dúvida", icon: HelpCircle },
  payment: { label: "Pagamento", icon: CreditCard },
};

export default function UserSupport() {
  const {
    tickets,
    isLoading,
    messages,
    isLoadingMessages,
    createTicket,
    fetchTicketMessages,
    sendMessage,
    toggleConsent,
    refetch,
  } = useUserSupport();

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("question");
  const [consentGranted, setConsentGranted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply
  const [replyMessage, setReplyMessage] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setIsSubmitting(true);
    await createTicket(subject.trim(), message.trim(), ticketType, consentGranted);
    setSubject("");
    setMessage("");
    setTicketType("question");
    setConsentGranted(false);
    setShowNewTicket(false);
    setIsSubmitting(false);
  };

  const handleOpenDetail = (ticket: UserTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
    fetchTicketMessages(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    await sendMessage(selectedTicket.id, replyMessage);
    setReplyMessage("");
  };

  const handleToggleConsent = async (ticket: UserTicket) => {
    await toggleConsent(ticket.id, !ticket.consent_granted);
    // Update local state
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket({ ...ticket, consent_granted: !ticket.consent_granted });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
            <p className="text-sm text-muted-foreground">
              Abra tickets e acompanhe o atendimento
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={() => setShowNewTicket(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Button>
        </div>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Abrir Novo Ticket</CardTitle>
            <CardDescription>Descreva o problema ou dúvida para nossa equipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Resumo do problema..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={ticketType} onValueChange={(v) => setTicketType(v as TicketType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Descreva em detalhes o que está acontecendo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Separator />

            {/* Consent Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Autorizar acesso de suporte
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permite que a equipe acesse sua conta em modo somente leitura (24h)
                  </p>
                </div>
              </div>
              <Switch
                checked={consentGranted}
                onCheckedChange={setConsentGranted}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!subject.trim() || !message.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Meus Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p className="font-medium">Nenhum ticket aberto</p>
              <p className="text-sm">Clique em "Novo Ticket" para iniciar um atendimento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status];
                const StatusIcon = statusCfg?.icon || Clock;
                const typeCfg = TYPE_CONFIG[ticket.ticket_type];
                const TypeIcon = typeCfg?.icon || HelpCircle;

                return (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleOpenDetail(ticket)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          #{ticket.id.slice(0, 8)} •{" "}
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {ticket.consent_granted ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ShieldOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className={statusCfg?.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusCfg?.label || ticket.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Ticket #{selectedTicket?.id.slice(0, 8)} •{" "}
              {selectedTicket && STATUS_CONFIG[selectedTicket.status]?.label}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Consent toggle inside detail */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  {selectedTicket.consent_granted ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Acesso de suporte:{" "}
                      <span className={selectedTicket.consent_granted ? "text-emerald-600" : "text-muted-foreground"}>
                        {selectedTicket.consent_granted ? "Autorizado" : "Não autorizado"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Modo somente leitura por 24h
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedTicket.consent_granted}
                  onCheckedChange={() => handleToggleConsent(selectedTicket)}
                />
              </div>

              {/* Messages */}
              <ScrollArea className="h-[300px] pr-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Original message */}
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Você</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{selectedTicket.message}</p>
                    </div>

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.sender_type === "admin"
                            ? "bg-primary/10 ml-6"
                            : "bg-muted mr-6"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_type === "admin" ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {msg.sender_type === "admin" ? "Suporte" : "Você"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Reply input */}
              {selectedTicket.status !== "resolved" && (
                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Digite sua mensagem..."
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
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
