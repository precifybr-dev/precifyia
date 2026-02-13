
-- Wrap all admin functions with role check

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, business_name text, user_plan text, subscription_status text, subscription_expires_at timestamp with time zone, last_access_at timestamp with time zone, onboarding_step text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         p.business_name, COALESCE(p.user_plan, 'free'), COALESCE(p.subscription_status, 'trial'),
         p.subscription_expires_at, p.last_access_at, p.onboarding_step
  FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS TABLE(total_revenue numeric, mrr numeric, projected_next_month numeric, average_ticket numeric, total_payment_links bigint, paid_links bigint, pending_links bigint, failed_links bigint, conversion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH payment_stats AS (
    SELECT COUNT(*) as total_links, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
           SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid
    FROM public.user_payments
  ),
  plan_revenue AS (
    SELECT SUM(CASE WHEN user_plan = 'basic' THEN 29.90 WHEN user_plan = 'pro' THEN 59.90 ELSE 0 END) as current_mrr,
           AVG(CASE WHEN user_plan IN ('basic','pro') THEN CASE WHEN user_plan = 'basic' THEN 29.90 ELSE 59.90 END ELSE NULL END) as avg_ticket
    FROM public.profiles WHERE subscription_status = 'active'
  )
  SELECT COALESCE(ps.total_paid,0), COALESCE(pr.current_mrr,0), COALESCE(pr.current_mrr*1.05,0),
         COALESCE(pr.avg_ticket,0), COALESCE(ps.total_links,0), COALESCE(ps.paid,0),
         COALESCE(ps.pending,0), COALESCE(ps.failed,0),
         CASE WHEN ps.total_links > 0 THEN (ps.paid::NUMERIC/ps.total_links*100) ELSE 0 END
  FROM payment_stats ps CROSS JOIN plan_revenue pr;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ltv_metrics()
RETURNS TABLE(average_ltv numeric, average_subscription_months numeric, total_active_subscribers bigint, ltv_by_plan jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH plan_prices AS (
    SELECT unnest(ARRAY['free','basic','pro']) AS plan, unnest(ARRAY[0,49.90,99.90]) AS price
  ),
  active_users AS (
    SELECT p.user_id, p.user_plan, p.created_at, p.subscription_status,
           GREATEST(1, EXTRACT(EPOCH FROM (now()-p.created_at))/(30*24*3600))::NUMERIC AS months_active
    FROM profiles p WHERE p.subscription_status = 'active'
  ),
  user_ltv AS (
    SELECT au.user_plan, au.months_active, COALESCE(pp.price,0)*au.months_active AS estimated_ltv
    FROM active_users au LEFT JOIN plan_prices pp ON pp.plan = COALESCE(au.user_plan,'free')
  )
  SELECT COALESCE(AVG(ul.estimated_ltv),0)::NUMERIC, COALESCE(AVG(ul.months_active),0)::NUMERIC,
         COUNT(*)::BIGINT, COALESCE(jsonb_agg(jsonb_build_object('plan',ul.user_plan,'avg_ltv',ul.estimated_ltv,'months',ul.months_active)),'[]'::jsonb)
  FROM user_ltv ul;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inactive_users(inactive_days integer DEFAULT 7)
RETURNS TABLE(user_id uuid, email text, business_name text, last_activity timestamp with time zone, days_inactive integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH last_user_activity AS (
    SELECT pe.user_id, MAX(pe.created_at) as last_activity FROM public.platform_events pe GROUP BY pe.user_id
  )
  SELECT u.id, u.email, p.business_name, COALESCE(lua.last_activity, p.created_at),
         EXTRACT(DAY FROM NOW()-COALESCE(lua.last_activity,p.created_at))::integer
  FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN last_user_activity lua ON lua.user_id = u.id
  WHERE COALESCE(lua.last_activity,p.created_at) < NOW()-(inactive_days||' days')::INTERVAL
  ORDER BY 5 DESC LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_churn_risk_users()
RETURNS TABLE(user_id uuid, email text, business_name text, user_plan text, last_activity timestamp with time zone, previous_activity_level text, days_since_active integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH user_activity AS (
    SELECT ua_inner.user_id, MAX(ua_inner.created_at) as last_activity,
           COUNT(*) FILTER (WHERE ua_inner.created_at >= NOW()-INTERVAL '30 days') as recent_events,
           COUNT(*) FILTER (WHERE ua_inner.created_at >= NOW()-INTERVAL '60 days' AND ua_inner.created_at < NOW()-INTERVAL '30 days') as previous_events
    FROM public.platform_events ua_inner GROUP BY ua_inner.user_id
  )
  SELECT u.id, u.email, p.business_name, COALESCE(p.user_plan,'free'),
         ua.last_activity,
         CASE WHEN ua.previous_events > 50 THEN 'high' WHEN ua.previous_events > 20 THEN 'medium' ELSE 'low' END,
         EXTRACT(DAY FROM NOW()-ua.last_activity)::integer
  FROM auth.users u JOIN user_activity ua ON ua.user_id = u.id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE ua.recent_events < 5 AND ua.previous_events > 10 AND ua.last_activity < NOW()-INTERVAL '7 days'
  ORDER BY ua.previous_events DESC LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_users(limit_count integer DEFAULT 20)
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, business_name text, user_plan text, onboarding_step text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, p.business_name, COALESCE(p.user_plan,'free'), p.onboarding_step
  FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mrr_stats()
RETURNS TABLE(plan_type text, user_count bigint, mrr numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT COALESCE(user_plan,'free'), COUNT(*),
         CASE WHEN user_plan = 'basic' THEN COUNT(*)*29.90 WHEN user_plan = 'pro' THEN COUNT(*)*59.90 ELSE 0 END
  FROM public.profiles GROUP BY user_plan ORDER BY 3 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_by_plan()
RETURNS TABLE(plan_type text, user_count bigint, monthly_revenue numeric, percentage numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH plan_data AS (
    SELECT COALESCE(user_plan,'free') as plan, COUNT(*) as users,
           SUM(CASE WHEN user_plan='basic' THEN 29.90 WHEN user_plan='pro' THEN 59.90 ELSE 0 END) as revenue
    FROM public.profiles WHERE subscription_status IN ('active','trial') GROUP BY user_plan
  ), total AS (SELECT SUM(revenue) as total_revenue FROM plan_data)
  SELECT pd.plan, pd.users, pd.revenue,
         CASE WHEN t.total_revenue > 0 THEN (pd.revenue/t.total_revenue*100) ELSE 0 END
  FROM plan_data pd CROSS JOIN total t ORDER BY pd.revenue DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_renewal_stats()
RETURNS TABLE(expiring_today bigint, expiring_7_days bigint, expiring_15_days bigint, expiring_30_days bigint, potential_revenue_today numeric, potential_revenue_7_days numeric, potential_revenue_15_days numeric, potential_revenue_30_days numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  WITH expiry_data AS (
    SELECT user_plan, subscription_expires_at,
           CASE WHEN user_plan='basic' THEN 29.90 WHEN user_plan='pro' THEN 59.90 ELSE 0 END as plan_value
    FROM public.profiles WHERE subscription_status='active' AND subscription_expires_at IS NOT NULL
  )
  SELECT COUNT(CASE WHEN DATE(subscription_expires_at)=CURRENT_DATE THEN 1 END),
         COUNT(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '7 days' THEN 1 END),
         COUNT(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '15 days' THEN 1 END),
         COUNT(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '30 days' THEN 1 END),
         COALESCE(SUM(CASE WHEN DATE(subscription_expires_at)=CURRENT_DATE THEN plan_value ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '7 days' THEN plan_value ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '15 days' THEN plan_value ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN subscription_expires_at<=NOW()+INTERVAL '30 days' THEN plan_value ELSE 0 END),0)
  FROM expiry_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_stats(days_back integer DEFAULT 30)
RETURNS TABLE(registration_date date, user_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT DATE(created_at), COUNT(*) FROM auth.users
  WHERE created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY DATE(created_at) ORDER BY 1 ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_back integer DEFAULT 30)
RETURNS TABLE(activity_date date, active_users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT DATE(created_at), COUNT(DISTINCT user_id)
  FROM public.platform_events WHERE created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY DATE(created_at) ORDER BY 1 ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_most_used_features(days_back integer DEFAULT 30)
RETURNS TABLE(feature_name text, usage_count bigint, unique_users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT event_type, COUNT(*), COUNT(DISTINCT user_id)
  FROM public.platform_events WHERE created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY event_type ORDER BY 2 DESC LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_stats_by_category(days_back integer DEFAULT 30)
RETURNS TABLE(event_category text, event_count bigint, unique_users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT pe.event_category, COUNT(*), COUNT(DISTINCT pe.user_id)
  FROM public.platform_events pe WHERE pe.created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY pe.event_category ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage_by_hour(days_back integer DEFAULT 7)
RETURNS TABLE(hour_of_day integer, event_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT EXTRACT(HOUR FROM created_at)::integer, COUNT(*)
  FROM public.platform_events WHERE created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_average_session_duration()
RETURNS TABLE(avg_duration_minutes numeric, total_sessions bigint, sessions_today bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT COALESCE(AVG(duration_seconds)/60.0,0)::numeric, COUNT(*),
         COUNT(CASE WHEN DATE(started_at)=CURRENT_DATE THEN 1 END)
  FROM public.user_sessions WHERE duration_seconds IS NOT NULL AND duration_seconds > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expiring_users_by_plan(days_ahead integer DEFAULT 30)
RETURNS TABLE(plan_type text, user_count bigint, potential_revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT COALESCE(user_plan,'free'), COUNT(*),
         SUM(CASE WHEN user_plan='basic' THEN 29.90 WHEN user_plan='pro' THEN 59.90 ELSE 0 END)
  FROM public.profiles
  WHERE subscription_status='active' AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at <= NOW()+(days_ahead||' days')::INTERVAL
  GROUP BY user_plan ORDER BY 3 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_by_period(days_back integer DEFAULT 30)
RETURNS TABLE(period_date date, revenue numeric, payment_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT DATE(created_at), SUM(amount), COUNT(*)
  FROM public.user_payments WHERE status='paid' AND created_at >= NOW()-(days_back||' days')::INTERVAL
  GROUP BY DATE(created_at) ORDER BY 1 ASC;
END;
$$;
