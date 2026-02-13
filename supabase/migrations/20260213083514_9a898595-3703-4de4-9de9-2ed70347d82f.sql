
-- Global AI Circuit Breaker
-- Prevents total API budget exhaustion by limiting requests per endpoint globally
CREATE OR REPLACE FUNCTION public.check_global_ai_limit(
  _endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
  v_limit_per_minute int := 30;   -- max 30 requests/min globally per endpoint
  v_limit_per_hour int := 300;    -- max 300 requests/hour globally per endpoint
BEGIN
  -- Check per-minute burst
  SELECT count(*)
  INTO v_count
  FROM strategic_usage_logs
  WHERE endpoint = _endpoint
    AND created_at >= now() - interval '1 minute';

  IF v_count >= v_limit_per_minute THEN
    RETURN false;
  END IF;

  -- Check per-hour sustained
  SELECT count(*)
  INTO v_count
  FROM strategic_usage_logs
  WHERE endpoint = _endpoint
    AND created_at >= now() - interval '1 hour';

  IF v_count >= v_limit_per_hour THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
