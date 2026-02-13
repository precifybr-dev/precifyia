
-- =============================================
-- MÓDULO DE CUPONS E AFILIADOS
-- =============================================

-- 1. AFFILIATES
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  commission_rate NUMERIC NOT NULL DEFAULT 20.00,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_pending NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random', NULL)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 2. COUPONS
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  coupon_type TEXT NOT NULL DEFAULT 'influencer' CHECK (coupon_type IN ('influencer', 'trial_influencer', 'internal')),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'trial_days')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code)
);

-- 3. COUPON_USES
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  applied_discount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COMMISSIONS
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  referred_user_id UUID NOT NULL,
  payment_id UUID,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 20.00,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'approved', 'paid', 'cancelled')),
  period_month INTEGER,
  period_year INTEGER,
  recurring_month INTEGER NOT NULL DEFAULT 1,
  max_recurring_months INTEGER NOT NULL DEFAULT 12,
  cancelled_reason TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COMMISSION_PAYOUTS
CREATE TABLE public.commission_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  pix_key TEXT,
  pix_key_type TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'paid', 'failed', 'cancelled')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. FRAUD_FLAGS
CREATE TABLE public.fraud_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('self_referral', 'ip_abuse', 'email_pattern', 'rapid_signup', 'fake_payment', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- AFFILIATES: master vê tudo, afiliado vê só o próprio
CREATE POLICY "Master can manage affiliates"
  ON public.affiliates FOR ALL
  USING (public.is_master(auth.uid()));

CREATE POLICY "Affiliate can view own profile"
  ON public.affiliates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Affiliate can update own pix"
  ON public.affiliates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- COUPONS: master gerencia, leitura pública para validação
CREATE POLICY "Master can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_master(auth.uid()));

CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- COUPON_USES: master vê tudo, usuário vê os próprios
CREATE POLICY "Master can view all coupon uses"
  ON public.coupon_uses FOR ALL
  USING (public.is_master(auth.uid()));

CREATE POLICY "User can view own coupon uses"
  ON public.coupon_uses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert coupon use"
  ON public.coupon_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- COMMISSIONS: master vê tudo, afiliado vê as próprias
CREATE POLICY "Master can manage commissions"
  ON public.commissions FOR ALL
  USING (public.is_master(auth.uid()));

CREATE POLICY "Affiliate can view own commissions"
  ON public.commissions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- COMMISSION_PAYOUTS: master gerencia, afiliado vê os próprios
CREATE POLICY "Master can manage payouts"
  ON public.commission_payouts FOR ALL
  USING (public.is_master(auth.uid()));

CREATE POLICY "Affiliate can view own payouts"
  ON public.commission_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliate can request payout"
  ON public.commission_payouts FOR INSERT
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- FRAUD_FLAGS: somente master
CREATE POLICY "Master can manage fraud flags"
  ON public.fraud_flags FOR ALL
  USING (public.is_master(auth.uid()));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_affiliate ON public.coupons(affiliate_id);
CREATE INDEX idx_coupon_uses_coupon ON public.coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_user ON public.coupon_uses(user_id);
CREATE INDEX idx_commissions_affiliate ON public.commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_referred ON public.commissions(referred_user_id);
CREATE INDEX idx_fraud_flags_affiliate ON public.fraud_flags(affiliate_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_payouts_updated_at
  BEFORE UPDATE ON public.commission_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Incrementar current_uses ao inserir coupon_use
CREATE OR REPLACE FUNCTION public.increment_coupon_uses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_coupon_uses_trigger
  AFTER INSERT ON public.coupon_uses
  FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_uses();

-- Proteger status financeiro de comissões (só service_role pode alterar status para approved/paid)
CREATE OR REPLACE FUNCTION public.protect_commission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'paid') AND NEW.status != OLD.status THEN
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Não é permitido alterar status de comissões aprovadas/pagas';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_commission_status_trigger
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_commission_status();
