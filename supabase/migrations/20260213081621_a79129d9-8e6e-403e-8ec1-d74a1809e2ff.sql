
CREATE TABLE public.risk_flags (
  user_id uuid PRIMARY KEY,
  risk_score integer NOT NULL DEFAULT 0,
  shadow_banned boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;

-- Only master can view
CREATE POLICY "Master can manage risk flags"
ON public.risk_flags
FOR ALL
TO authenticated
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- No access for regular users

CREATE INDEX idx_risk_flags_risk_score ON public.risk_flags(risk_score);
