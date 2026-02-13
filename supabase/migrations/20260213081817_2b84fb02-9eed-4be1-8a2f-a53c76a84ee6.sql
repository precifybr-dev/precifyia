
CREATE TABLE public.rate_limit_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip text,
  fingerprint_hash text,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_global ENABLE ROW LEVEL SECURITY;

-- No direct access for authenticated users; operated via service_role only
CREATE POLICY "Block all user access"
ON public.rate_limit_global
FOR ALL
TO authenticated
USING (false);

CREATE INDEX idx_rate_limit_global_user_endpoint ON public.rate_limit_global(user_id, endpoint, created_at);
CREATE INDEX idx_rate_limit_global_ip_endpoint ON public.rate_limit_global(ip, endpoint, created_at);
