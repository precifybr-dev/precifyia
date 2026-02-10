
-- Recreate admin_metrics view with security_invoker to prevent public access
-- The view queries auth.users which requires elevated permissions
-- With security_invoker, only users who can access auth.users (service_role) will see data
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics
WITH (security_invoker = on) AS
SELECT 
  (SELECT count(*) FROM auth.users) AS total_users,
  (SELECT count(*) FROM auth.users WHERE created_at >= (now() - '1 day'::interval)) AS users_today,
  (SELECT count(*) FROM auth.users WHERE created_at >= (now() - '7 days'::interval)) AS users_week,
  (SELECT count(*) FROM auth.users WHERE created_at >= (now() - '30 days'::interval)) AS users_month,
  (SELECT count(*) FROM profiles WHERE user_plan = 'basic') AS basic_plan_users,
  (SELECT count(*) FROM profiles WHERE user_plan = 'pro') AS pro_plan_users,
  (SELECT count(*) FROM profiles WHERE user_plan = 'free' OR user_plan IS NULL) AS free_plan_users;
