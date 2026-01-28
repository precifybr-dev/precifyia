import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketType = "bug" | "question" | "payment";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_business_name?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
  sender_name?: string;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  admin_id: string;
  note: string;
  created_at: string;
  admin_name?: string;
}

export function useSupportDashboard() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TicketType | "all">("all");

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("ticket_type", typeFilter);
      }

      const { data: ticketsData, error } = await query;

      if (error) throw error;

      // Fetch user info for each ticket
      const ticketsWithUsers: SupportTicket[] = [];
      for (const ticket of ticketsData || []) {
        const { data: userData } = await supabase.rpc("get_all_users_admin");
        const user = userData?.find((u: any) => u.id === ticket.user_id);
        ticketsWithUsers.push({
          ...ticket,
          user_email: user?.email || "Usuário não encontrado",
          user_business_name: user?.business_name || "",
        } as SupportTicket);
      }

      setTickets(ticketsWithUsers);
    } catch (error: any) {
      console.error("Erro ao buscar tickets:", error);
      toast({
        title: "Erro ao carregar tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, toast]);

  const fetchTicketDetails = useCallback(async (ticketId: string) => {
    try {
      setIsLoadingMessages(true);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("ticket_notes")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Get collaborator names for notes
      const { data: collaborators } = await supabase
        .from("collaborators")
        .select("user_id, name");

      const notesWithNames = (notesData || []).map((note) => ({
        ...note,
        admin_name:
          collaborators?.find((c) => c.user_id === note.admin_id)?.name || "Administrador",
      }));

      const typedMessages: TicketMessage[] = (messagesData || []).map((msg) => ({
        ...msg,
        sender_type: msg.sender_type as "user" | "admin",
      }));

      setMessages(typedMessages);
      setNotes(notesWithNames);
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do ticket:", error);
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast]);

  const sendMessage = async (ticketId: string, message: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: session.user.id,
        sender_type: "admin",
        message,
      });

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_user_id: session.user.id,
        target_user_id: selectedTicket?.user_id,
        action_type: "respond_ticket",
        action: `Respondeu ao ticket: ${ticketId}`,
        new_value: { message },
      });

      toast({
        title: "Mensagem enviada",
        description: "Resposta enviada ao usuário com sucesso.",
      });

      await fetchTicketDetails(ticketId);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addNote = async (ticketId: string, note: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        admin_id: session.user.id,
        note,
      });

      if (error) throw error;

      toast({
        title: "Nota adicionada",
        description: "Nota interna salva com sucesso.",
      });

      await fetchTicketDetails(ticketId);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const updates: any = { status };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_user_id: session.user.id,
        target_user_id: selectedTicket?.user_id,
        action_type: "update_ticket_status",
        action: `Atualizou status do ticket para: ${status}`,
        old_value: { status: selectedTicket?.status },
        new_value: { status },
      });

      toast({
        title: "Status atualizado",
        description: `Ticket marcado como ${status === "resolved" ? "resolvido" : status === "in_progress" ? "em andamento" : "aberto"}.`,
      });

      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: TicketPriority) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("support_tickets")
        .update({ priority })
        .eq("id", ticketId);

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_user_id: session.user.id,
        target_user_id: selectedTicket?.user_id,
        action_type: "update_ticket_priority",
        action: `Atualizou prioridade do ticket para: ${priority}`,
        old_value: { priority: selectedTicket?.priority },
        new_value: { priority },
      });

      toast({
        title: "Prioridade atualizada",
        description: `Ticket priorizado como ${priority}.`,
      });

      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, priority } : null));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar prioridade",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const assignTicket = async (ticketId: string, adminId: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: adminId })
        .eq("id", ticketId);

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_user_id: session.user.id,
        target_user_id: selectedTicket?.user_id,
        action_type: "assign_ticket",
        action: adminId ? `Atribuiu ticket ao colaborador ${adminId}` : "Removeu atribuição do ticket",
        new_value: { assigned_to: adminId },
      });

      toast({
        title: adminId ? "Ticket atribuído" : "Atribuição removida",
        description: adminId ? "Ticket atribuído com sucesso." : "Atribuição removida do ticket.",
      });

      await fetchTickets();
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir ticket",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket, fetchTicketDetails]);

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length,
  };

  return {
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
    refetch: fetchTickets,
    sendMessage,
    addNote,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
  };
}
