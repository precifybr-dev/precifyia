
-- Table: Maturity Score History (histórico de evolução do score)
CREATE TABLE public.architecture_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_score numeric NOT NULL DEFAULT 0,
  security_score numeric NOT NULL DEFAULT 0,
  backend_score numeric NOT NULL DEFAULT 0,
  continuity_score numeric NOT NULL DEFAULT 0,
  help_score numeric NOT NULL DEFAULT 0,
  ux_score numeric NOT NULL DEFAULT 0,
  governance_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'alto' CHECK (risk_level IN ('baixo','medio','alto')),
  critical_failures text[] DEFAULT '{}',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.architecture_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can manage score_history"
ON public.architecture_score_history FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Table: Architecture Certifications (selo de arquitetura aprovada)
CREATE TABLE public.architecture_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certified_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  overall_score numeric NOT NULL,
  security_score numeric NOT NULL,
  risk_level text NOT NULL,
  is_valid boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.architecture_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can manage certifications"
ON public.architecture_certifications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Add governance phase to base checks
INSERT INTO public.architecture_base_checks (phase, phase_name, check_name, check_description, is_blocking, sort_order) VALUES
(6, 'Governança', 'Registro completo de prompts', 'Todos os prompts estruturais registrados no sistema', false, 23),
(6, 'Governança', 'Scanner ativo', 'Auditoria automática de implementação ativa', false, 24),
(6, 'Governança', 'Auditoria automática', 'Recalculação contínua de score e risco', false, 25),
(6, 'Governança', 'Comparação com arquitetura base', 'Checklist de conformidade preenchido', false, 26);

-- Indexes
CREATE INDEX idx_score_history_created ON public.architecture_score_history(created_at DESC);
CREATE INDEX idx_certifications_valid ON public.architecture_certifications(is_valid);
