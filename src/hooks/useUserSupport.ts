import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketType = "bug" | "question" | "payment";

export interface UserTicket {
  id: string;
  subject: string;
  message: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: string;
  consent_granted: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
}

export function useUserSupport() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const fetchMyTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets((data || []).map((t: any) => ({
        ...t,
        ticket_type: t.ticket_type as TicketType,
        status: t.status as TicketStatus,
        consent_granted: t.consent_granted ?? false,
      })));
    } catch (error: any) {
      console.error("Erro ao buscar tickets:", error);
      toast({ title: "Erro ao carregar tickets", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createTicket = async (
    subject: string,
    message: string,
    ticketType: TicketType,
    consentGranted: boolean
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: session.user.id,
          subject,
          message,
          ticket_type: ticketType,
          consent_granted: consentGranted,
        })
        .select()
        .single();

      if (error) throw error;

      if (consentGranted && ticket) {
        const { error: consentError } = await supabase
          .from("support_consent")
          .insert({
            user_id: session.user.id,
            ticket_id: ticket.id,
            is_active: true,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

        if (consentError) console.error("Erro ao criar consentimento:", consentError);
      }

      toast({ title: "Ticket criado", description: "Seu ticket foi enviado com sucesso." });
      await fetchMyTickets();
      return ticket;
    } catch (error: any) {
      toast({ title: "Erro ao criar ticket", description: error.message, variant: "destructive" });
    }
  };

  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    try {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages((data || []).map((msg: any) => ({
        ...msg,
        sender_type: msg.sender_type as "user" | "admin",
      })));
    } catch (error: any) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const sendMessage = async (ticketId: string, message: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: session.user.id,
        sender_type: "user",
        message,
      });

      if (error) throw error;
      await fetchTicketMessages(ticketId);
    } catch (error: any) {
      toast({ title: "Erro ao enviar mensagem", description: error.message, variant: "destructive" });
    }
  };

  const toggleConsent = async (ticketId: string, grant: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      if (grant) {
        // Revoke any existing consent for this ticket first
        await supabase
          .from("support_consent")
          .update({ is_active: false, revoked_at: new Date().toISOString() })
          .eq("ticket_id", ticketId)
          .eq("user_id", session.user.id);

        // Create new consent
        const { error } = await supabase.from("support_consent").insert({
          user_id: session.user.id,
          ticket_id: ticketId,
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        if (error) throw error;
      } else {
        // Revoke consent
        const { error } = await supabase
          .from("support_consent")
          .update({ is_active: false, revoked_at: new Date().toISOString() })
          .eq("ticket_id", ticketId)
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        if (error) throw error;

        // Update ticket directly
        await supabase
          .from("support_tickets")
          .update({ consent_granted: false })
          .eq("id", ticketId);
      }

      toast({
        title: grant ? "Consentimento ativado" : "Consentimento revogado",
        description: grant
          ? "O suporte pode acessar sua conta em modo leitura."
          : "O acesso do suporte foi revogado.",
      });

      await fetchMyTickets();
    } catch (error: any) {
      toast({ title: "Erro ao alterar consentimento", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  return {
    tickets,
    isLoading,
    messages,
    isLoadingMessages,
    createTicket,
    fetchTicketMessages,
    sendMessage,
    toggleConsent,
    refetch: fetchMyTickets,
  };
}
