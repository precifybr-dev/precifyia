CREATE OR REPLACE FUNCTION public.get_cloud_cost_metrics(days_back integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'by_endpoint', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT endpoint, count(*) as calls, COALESCE(sum(tokens_used), 0) as total_tokens,
               count(distinct user_id) as unique_users
        FROM public.strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY endpoint ORDER BY total_tokens DESC
      ) t
    ),
    'by_user', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT s.user_id, p.business_name, p.user_plan,
               count(*) as calls, COALESCE(sum(s.tokens_used), 0) as total_tokens
        FROM public.strategic_usage_logs s
        LEFT JOIN public.profiles p ON p.user_id = s.user_id
        WHERE s.created_at >= now() - (days_back || ' days')::interval
        GROUP BY s.user_id, p.business_name, p.user_plan
        ORDER BY total_tokens DESC LIMIT 20
      ) t
    ),
    'daily', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT date(created_at) as day, count(*) as calls,
               COALESCE(sum(tokens_used), 0) as total_tokens
        FROM public.strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY date(created_at) ORDER BY day
      ) t
    ),
    'totals', (
      SELECT row_to_json(t)
      FROM (
        SELECT count(*) as total_calls, COALESCE(sum(tokens_used), 0) as total_tokens,
               count(distinct user_id) as total_users
        FROM public.strategic_usage_logs
        WHERE created_at >= now() - (days_back || ' days')::interval
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;