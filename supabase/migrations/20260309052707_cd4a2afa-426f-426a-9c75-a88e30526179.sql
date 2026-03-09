
CREATE TABLE public.dr_margem_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  critical_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvement_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  strong_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  advisor_message TEXT NOT NULL DEFAULT '',
  total_products_analyzed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dr_margem_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.dr_margem_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert reports"
  ON public.dr_margem_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dr_margem_reports_user_store ON public.dr_margem_reports(user_id, store_id, generated_at DESC);
