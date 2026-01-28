-- Create platform_events table for tracking user activity
CREATE TABLE public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'general',
  metadata jsonb DEFAULT '{}',
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_sessions table for tracking session duration
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer,
  page_views integer DEFAULT 0,
  events_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_events
CREATE POLICY "Users can insert their own events"
ON public.platform_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators can view all events"
ON public.platform_events FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- RLS policies for user_sessions
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators can view all sessions"
ON public.user_sessions FOR SELECT
USING (is_collaborator(auth.uid()) OR is_master(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_platform_events_user_id ON public.platform_events(user_id);
CREATE INDEX idx_platform_events_event_type ON public.platform_events(event_type);
CREATE INDEX idx_platform_events_created_at ON public.platform_events(created_at);
CREATE INDEX idx_platform_events_session_id ON public.platform_events(session_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at);

-- Function: Get Daily Active Users (DAU)
CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_back integer DEFAULT 30)
RETURNS TABLE(activity_date date, active_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as activity_date,
    COUNT(DISTINCT user_id) as active_users
  FROM public.platform_events
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY activity_date ASC;
$$;

-- Function: Get Average Session Duration
CREATE OR REPLACE FUNCTION public.get_average_session_duration()
RETURNS TABLE(avg_duration_minutes numeric, total_sessions bigint, sessions_today bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(AVG(duration_seconds) / 60.0, 0)::numeric as avg_duration_minutes,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN DATE(started_at) = CURRENT_DATE THEN 1 END) as sessions_today
  FROM public.user_sessions
  WHERE duration_seconds IS NOT NULL
    AND duration_seconds > 0;
$$;

-- Function: Get Most Used Features
CREATE OR REPLACE FUNCTION public.get_most_used_features(days_back integer DEFAULT 30)
RETURNS TABLE(feature_name text, usage_count bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    event_type as feature_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.platform_events
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY event_type
  ORDER BY usage_count DESC
  LIMIT 10;
$$;

-- Function: Get Inactive Users
CREATE OR REPLACE FUNCTION public.get_inactive_users(inactive_days integer DEFAULT 7)
RETURNS TABLE(user_id uuid, email text, business_name text, last_activity timestamp with time zone, days_inactive integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH last_user_activity AS (
    SELECT 
      pe.user_id,
      MAX(pe.created_at) as last_activity
    FROM public.platform_events pe
    GROUP BY pe.user_id
  )
  SELECT 
    u.id as user_id,
    u.email,
    p.business_name,
    COALESCE(lua.last_activity, p.created_at) as last_activity,
    EXTRACT(DAY FROM NOW() - COALESCE(lua.last_activity, p.created_at))::integer as days_inactive
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN last_user_activity lua ON lua.user_id = u.id
  WHERE COALESCE(lua.last_activity, p.created_at) < NOW() - (inactive_days || ' days')::INTERVAL
  ORDER BY days_inactive DESC
  LIMIT 50;
$$;

-- Function: Get Event Stats by Category
CREATE OR REPLACE FUNCTION public.get_event_stats_by_category(days_back integer DEFAULT 30)
RETURNS TABLE(event_category text, event_count bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    event_category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.platform_events
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY event_category
  ORDER BY event_count DESC;
$$;

-- Function: Get Usage Trends (hourly distribution)
CREATE OR REPLACE FUNCTION public.get_usage_by_hour(days_back integer DEFAULT 7)
RETURNS TABLE(hour_of_day integer, event_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(HOUR FROM created_at)::integer as hour_of_day,
    COUNT(*) as event_count
  FROM public.platform_events
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour_of_day;
$$;

-- Function: Get Churn Risk Users (active then inactive)
CREATE OR REPLACE FUNCTION public.get_churn_risk_users()
RETURNS TABLE(user_id uuid, email text, business_name text, user_plan text, last_activity timestamp with time zone, previous_activity_level text, days_since_active integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_activity AS (
    SELECT 
      user_id,
      MAX(created_at) as last_activity,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_events,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as previous_events
    FROM public.platform_events
    GROUP BY user_id
  )
  SELECT 
    u.id as user_id,
    u.email,
    p.business_name,
    COALESCE(p.user_plan, 'free') as user_plan,
    ua.last_activity,
    CASE 
      WHEN ua.previous_events > 50 THEN 'high'
      WHEN ua.previous_events > 20 THEN 'medium'
      ELSE 'low'
    END as previous_activity_level,
    EXTRACT(DAY FROM NOW() - ua.last_activity)::integer as days_since_active
  FROM auth.users u
  JOIN user_activity ua ON ua.user_id = u.id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE ua.recent_events < 5
    AND ua.previous_events > 10
    AND ua.last_activity < NOW() - INTERVAL '7 days'
  ORDER BY ua.previous_events DESC
  LIMIT 20;
$$;