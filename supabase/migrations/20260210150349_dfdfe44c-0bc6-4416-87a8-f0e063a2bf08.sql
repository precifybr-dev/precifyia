
-- Fix: Restrict plan_features to authenticated users only
DROP POLICY IF EXISTS "Anyone can read plan features" ON public.plan_features;

CREATE POLICY "Authenticated users can read plan features"
  ON public.plan_features
  FOR SELECT
  TO authenticated
  USING (true);
