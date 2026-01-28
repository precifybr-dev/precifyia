-- Create view for admin metrics (secure, only aggregated data)
CREATE OR REPLACE VIEW public.admin_metrics AS
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '1 day') as users_today,
  (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '7 days') as users_week,
  (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '30 days') as users_month,
  (SELECT COUNT(*) FROM public.profiles WHERE user_plan = 'basic') as basic_plan_users,
  (SELECT COUNT(*) FROM public.profiles WHERE user_plan = 'pro') as pro_plan_users,
  (SELECT COUNT(*) FROM public.profiles WHERE user_plan = 'free' OR user_plan IS NULL) as free_plan_users;

-- Grant access to the view
GRANT SELECT ON public.admin_metrics TO authenticated;

-- Create RLS policy for admin_metrics (only collaborators can access)
ALTER VIEW public.admin_metrics SET (security_invoker = on);

-- Create table for system alerts
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  target_roles app_role[] DEFAULT NULL
);

-- Enable RLS on admin_alerts
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Only collaborators can view alerts
CREATE POLICY "Collaborators can view alerts"
ON public.admin_alerts
FOR SELECT
USING (
  is_collaborator(auth.uid()) OR is_master(auth.uid())
);

-- Only master can manage alerts
CREATE POLICY "Master can manage alerts"
ON public.admin_alerts
FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Create function to get user registration stats by date
CREATE OR REPLACE FUNCTION public.get_registration_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  registration_date DATE,
  user_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as registration_date,
    COUNT(*) as user_count
  FROM auth.users
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY registration_date ASC
$$;

-- Create function to get MRR (Monthly Recurring Revenue)
CREATE OR REPLACE FUNCTION public.get_mrr_stats()
RETURNS TABLE (
  plan_type TEXT,
  user_count BIGINT,
  mrr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(user_plan, 'free') as plan_type,
    COUNT(*) as user_count,
    CASE 
      WHEN user_plan = 'basic' THEN COUNT(*) * 29.90
      WHEN user_plan = 'pro' THEN COUNT(*) * 59.90
      ELSE 0
    END as mrr
  FROM public.profiles
  GROUP BY user_plan
  ORDER BY mrr DESC
$$;

-- Create function to get recent users (without sensitive data)
CREATE OR REPLACE FUNCTION public.get_recent_users(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  business_name TEXT,
  user_plan TEXT,
  onboarding_step TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.email,
    u.created_at,
    p.business_name,
    COALESCE(p.user_plan, 'free') as user_plan,
    p.onboarding_step
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT limit_count
$$;