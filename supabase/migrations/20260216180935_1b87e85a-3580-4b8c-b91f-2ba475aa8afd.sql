
-- 1. Corrigir política de funnel_events
DROP POLICY IF EXISTS "Anyone can insert funnel events" ON public.funnel_events;
CREATE POLICY "Authenticated users can insert funnel events"
  ON public.funnel_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Revogar acesso direto à view admin_metrics
REVOKE ALL ON public.admin_metrics FROM authenticated;
REVOKE ALL ON public.admin_metrics FROM anon;
