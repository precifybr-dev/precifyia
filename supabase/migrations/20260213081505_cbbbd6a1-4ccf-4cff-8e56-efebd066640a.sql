
CREATE TABLE public.strategic_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fingerprint_hash text,
  ip_address text,
  user_agent text,
  endpoint text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own strategic logs"
ON public.strategic_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert own strategic logs"
ON public.strategic_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Master can view all logs
CREATE POLICY "Master can view all strategic logs"
ON public.strategic_usage_logs
FOR SELECT
TO authenticated
USING (is_master(auth.uid()));

-- No UPDATE or DELETE allowed

CREATE INDEX idx_strategic_usage_logs_user_id ON public.strategic_usage_logs(user_id);
CREATE INDEX idx_strategic_usage_logs_endpoint ON public.strategic_usage_logs(endpoint);
CREATE INDEX idx_strategic_usage_logs_created_at ON public.strategic_usage_logs(created_at);
