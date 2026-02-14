
-- Tabela de eventos do funil de conversão
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  cta_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_funnel_events_event_type ON public.funnel_events (event_type);
CREATE INDEX idx_funnel_events_created_at ON public.funnel_events (created_at DESC);
CREATE INDEX idx_funnel_events_anonymous_id ON public.funnel_events (anonymous_id);

-- RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode inserir eventos (anônimo)
CREATE POLICY "Anyone can insert funnel events"
ON public.funnel_events
FOR INSERT
WITH CHECK (true);

-- Apenas admin/master pode visualizar
CREATE POLICY "Only admins can view funnel events"
ON public.funnel_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'master'
  )
);
