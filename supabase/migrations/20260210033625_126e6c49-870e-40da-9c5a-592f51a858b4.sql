CREATE POLICY "Users can insert their own security"
  ON public.user_security
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);