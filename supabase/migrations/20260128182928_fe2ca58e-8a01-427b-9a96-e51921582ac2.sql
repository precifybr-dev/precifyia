-- Add ticket_type to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'question';

-- Create ticket_messages table for message history
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket_notes table for internal admin notes
CREATE TABLE public.ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;

-- RLS for ticket_messages: Users can see messages on their tickets, collaborators can see all
CREATE POLICY "Users can view messages on their tickets"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can view all messages"
ON public.ticket_messages FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Users can insert messages on their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  sender_type = 'user' AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can insert messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  (is_collaborator(auth.uid()) OR is_master(auth.uid())) AND
  sender_id = auth.uid()
);

-- RLS for ticket_notes: Only collaborators/masters can access (internal notes)
CREATE POLICY "Only collaborators can view notes"
ON public.ticket_notes FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Only collaborators can insert notes"
ON public.ticket_notes FOR INSERT
WITH CHECK (
  (is_collaborator(auth.uid()) OR is_master(auth.uid())) AND
  admin_id = auth.uid()
);

CREATE POLICY "Only collaborators can delete notes"
ON public.ticket_notes FOR DELETE
USING (
  (is_collaborator(auth.uid()) OR is_master(auth.uid())) AND
  admin_id = auth.uid()
);

-- Add index for performance
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_notes_ticket_id ON public.ticket_notes(ticket_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_ticket_type ON public.support_tickets(ticket_type);