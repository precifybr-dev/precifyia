CREATE POLICY "Users can delete own metrics"
  ON public.ifood_monthly_metrics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);