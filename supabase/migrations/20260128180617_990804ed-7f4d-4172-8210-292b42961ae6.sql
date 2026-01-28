-- Add subscription-related fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial' 
  CHECK (subscription_status IN ('active', 'trial', 'expired', 'canceled')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE;

-- Create admin_audit_logs table for tracking all admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'view_user', 'impersonate', 'reset_password', 'change_plan', 
    'extend_subscription', 'view_financial', 'view_support'
  )),
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only collaborators can view audit logs
CREATE POLICY "Collaborators can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Only collaborators can insert audit logs
CREATE POLICY "Collaborators can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Create support_tickets table for support history
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Collaborators can view all tickets
CREATE POLICY "Collaborators can view all tickets"
ON public.support_tickets
FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Collaborators can update tickets
CREATE POLICY "Collaborators can update tickets"
ON public.support_tickets
FOR UPDATE
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Create user_payments table for financial history
CREATE TABLE public.user_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  plan_type TEXT,
  description TEXT,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_payments
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.user_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Collaborators can view all payments
CREATE POLICY "Collaborators can view all payments"
ON public.user_payments
FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Masters can insert payments
CREATE POLICY "Masters can manage payments"
ON public.user_payments
FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Create function to get all users for admin
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  business_name TEXT,
  user_plan TEXT,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  last_access_at TIMESTAMP WITH TIME ZONE,
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
    u.last_sign_in_at,
    p.business_name,
    COALESCE(p.user_plan, 'free') as user_plan,
    COALESCE(p.subscription_status, 'trial') as subscription_status,
    p.subscription_expires_at,
    p.last_access_at,
    p.onboarding_step
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC
$$;