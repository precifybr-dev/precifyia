
-- Policy already exists, just drop and recreate to ensure correct definition
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.data_audit_log;

CREATE POLICY "Users can view own audit logs"
  ON public.data_audit_log
  FOR SELECT
  USING (user_id = auth.uid());
