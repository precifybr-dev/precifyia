
-- Create admin export audit log table
CREATE TABLE public.admin_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  module TEXT NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success'
);

-- Enable RLS
ALTER TABLE public.admin_export_logs ENABLE ROW LEVEL SECURITY;

-- Only master/admin can view export logs
CREATE POLICY "Admin can view export logs"
  ON public.admin_export_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')
  );

-- Only service_role can insert (edge function)
CREATE POLICY "Service role can insert export logs"
  ON public.admin_export_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Index for quick lookups
CREATE INDEX idx_admin_export_logs_admin_id ON public.admin_export_logs(admin_id);
CREATE INDEX idx_admin_export_logs_exported_at ON public.admin_export_logs(exported_at DESC);
