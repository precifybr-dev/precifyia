
-- Signup rate limit function per IP
CREATE OR REPLACE FUNCTION public.check_signup_limit(_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Max 5 signups per IP per hour
  SELECT count(*)
  INTO v_count
  FROM rate_limit_global
  WHERE ip = _ip
    AND endpoint = 'secure-signup'
    AND created_at >= now() - interval '1 hour';

  IF v_count >= 5 THEN
    RETURN false;
  END IF;

  -- Max 2 signups per IP per 10 minutes (burst)
  SELECT count(*)
  INTO v_count
  FROM rate_limit_global
  WHERE ip = _ip
    AND endpoint = 'secure-signup'
    AND created_at >= now() - interval '10 minutes';

  IF v_count >= 2 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
