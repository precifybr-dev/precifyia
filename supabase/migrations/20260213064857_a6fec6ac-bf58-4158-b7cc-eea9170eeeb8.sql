
CREATE TABLE public.contract_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptances"
  ON public.contract_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acceptances"
  ON public.contract_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_contract_acceptances_user_id ON public.contract_acceptances(user_id);
