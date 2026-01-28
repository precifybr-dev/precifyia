-- Create payment_links table to track payment links
CREATE TABLE public.payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  external_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_links
CREATE POLICY "Collaborators can view all payment links"
  ON public.payment_links
  FOR SELECT
  USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Masters can manage payment links"
  ON public.payment_links
  FOR ALL
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Users can view own payment links"
  ON public.payment_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_payment_links_user_id ON public.payment_links(user_id);
CREATE INDEX idx_payment_links_status ON public.payment_links(status);
CREATE INDEX idx_payment_links_created_at ON public.payment_links(created_at);

-- Function to get financial summary
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS TABLE(
  total_revenue NUMERIC,
  mrr NUMERIC,
  projected_next_month NUMERIC,
  average_ticket NUMERIC,
  total_payment_links BIGINT,
  paid_links BIGINT,
  pending_links BIGINT,
  failed_links BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH payment_stats AS (
    SELECT 
      COUNT(*) as total_links,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid
    FROM public.user_payments
  ),
  plan_revenue AS (
    SELECT 
      SUM(CASE 
        WHEN user_plan = 'basic' THEN 29.90
        WHEN user_plan = 'pro' THEN 59.90
        ELSE 0
      END) as current_mrr,
      AVG(CASE 
        WHEN user_plan IN ('basic', 'pro') THEN 
          CASE WHEN user_plan = 'basic' THEN 29.90 ELSE 59.90 END
        ELSE NULL
      END) as avg_ticket
    FROM public.profiles
    WHERE subscription_status = 'active'
  )
  SELECT 
    COALESCE(ps.total_paid, 0) as total_revenue,
    COALESCE(pr.current_mrr, 0) as mrr,
    COALESCE(pr.current_mrr * 1.05, 0) as projected_next_month,
    COALESCE(pr.avg_ticket, 0) as average_ticket,
    COALESCE(ps.total_links, 0) as total_payment_links,
    COALESCE(ps.paid, 0) as paid_links,
    COALESCE(ps.pending, 0) as pending_links,
    COALESCE(ps.failed, 0) as failed_links,
    CASE 
      WHEN ps.total_links > 0 THEN (ps.paid::NUMERIC / ps.total_links * 100)
      ELSE 0
    END as conversion_rate
  FROM payment_stats ps
  CROSS JOIN plan_revenue pr;
$$;

-- Function to get revenue by plan
CREATE OR REPLACE FUNCTION public.get_revenue_by_plan()
RETURNS TABLE(
  plan_type TEXT,
  user_count BIGINT,
  monthly_revenue NUMERIC,
  percentage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH plan_data AS (
    SELECT 
      COALESCE(user_plan, 'free') as plan,
      COUNT(*) as users,
      SUM(CASE 
        WHEN user_plan = 'basic' THEN 29.90
        WHEN user_plan = 'pro' THEN 59.90
        ELSE 0
      END) as revenue
    FROM public.profiles
    WHERE subscription_status IN ('active', 'trial')
    GROUP BY user_plan
  ),
  total AS (
    SELECT SUM(revenue) as total_revenue FROM plan_data
  )
  SELECT 
    pd.plan as plan_type,
    pd.users as user_count,
    pd.revenue as monthly_revenue,
    CASE 
      WHEN t.total_revenue > 0 THEN (pd.revenue / t.total_revenue * 100)
      ELSE 0
    END as percentage
  FROM plan_data pd
  CROSS JOIN total t
  ORDER BY pd.revenue DESC;
$$;

-- Function to get revenue by period
CREATE OR REPLACE FUNCTION public.get_revenue_by_period(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  period_date DATE,
  revenue NUMERIC,
  payment_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as period_date,
    SUM(amount) as revenue,
    COUNT(*) as payment_count
  FROM public.user_payments
  WHERE status = 'paid'
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY period_date ASC;
$$;

-- Function to get renewal statistics
CREATE OR REPLACE FUNCTION public.get_renewal_stats()
RETURNS TABLE(
  expiring_today BIGINT,
  expiring_7_days BIGINT,
  expiring_15_days BIGINT,
  expiring_30_days BIGINT,
  potential_revenue_today NUMERIC,
  potential_revenue_7_days NUMERIC,
  potential_revenue_15_days NUMERIC,
  potential_revenue_30_days NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expiry_data AS (
    SELECT 
      user_plan,
      subscription_expires_at,
      CASE 
        WHEN user_plan = 'basic' THEN 29.90
        WHEN user_plan = 'pro' THEN 59.90
        ELSE 0
      END as plan_value
    FROM public.profiles
    WHERE subscription_status = 'active'
      AND subscription_expires_at IS NOT NULL
  )
  SELECT 
    COUNT(CASE WHEN DATE(subscription_expires_at) = CURRENT_DATE THEN 1 END) as expiring_today,
    COUNT(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '7 days' THEN 1 END) as expiring_7_days,
    COUNT(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '15 days' THEN 1 END) as expiring_15_days,
    COUNT(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '30 days' THEN 1 END) as expiring_30_days,
    COALESCE(SUM(CASE WHEN DATE(subscription_expires_at) = CURRENT_DATE THEN plan_value ELSE 0 END), 0) as potential_revenue_today,
    COALESCE(SUM(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '7 days' THEN plan_value ELSE 0 END), 0) as potential_revenue_7_days,
    COALESCE(SUM(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '15 days' THEN plan_value ELSE 0 END), 0) as potential_revenue_15_days,
    COALESCE(SUM(CASE WHEN subscription_expires_at <= NOW() + INTERVAL '30 days' THEN plan_value ELSE 0 END), 0) as potential_revenue_30_days
  FROM expiry_data;
$$;

-- Function to get expiring users by plan
CREATE OR REPLACE FUNCTION public.get_expiring_users_by_plan(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
  plan_type TEXT,
  user_count BIGINT,
  potential_revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(user_plan, 'free') as plan_type,
    COUNT(*) as user_count,
    SUM(CASE 
      WHEN user_plan = 'basic' THEN 29.90
      WHEN user_plan = 'pro' THEN 59.90
      ELSE 0
    END) as potential_revenue
  FROM public.profiles
  WHERE subscription_status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at <= NOW() + (days_ahead || ' days')::INTERVAL
  GROUP BY user_plan
  ORDER BY potential_revenue DESC;
$$;