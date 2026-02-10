
-- Fix 1: rate_limit_entries - add RLS policy for service-role only access
-- Regular users should never access this table; only backend functions (service role) use it.
-- We add a restrictive policy that denies all authenticated/anon access.
CREATE POLICY "Only service role can access rate limits"
  ON public.rate_limit_entries
  FOR ALL
  TO authenticated
  USING (false);

-- Fix 2: admin_metrics view - restrict to master/admin roles only
-- The view uses security_invoker=on but needs explicit grant restrictions
REVOKE ALL ON public.admin_metrics FROM anon;
REVOKE ALL ON public.admin_metrics FROM authenticated;

-- Grant only to authenticated, but we'll add a security definer wrapper
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
  total_users bigint,
  users_today bigint,
  users_week bigint,
  users_month bigint,
  basic_plan_users bigint,
  pro_plan_users bigint,
  free_plan_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_metrics
  WHERE public.has_role(auth.uid(), 'master') 
     OR public.has_role(auth.uid(), 'admin');
$$;
