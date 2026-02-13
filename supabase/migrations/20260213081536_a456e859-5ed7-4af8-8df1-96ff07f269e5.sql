
CREATE OR REPLACE FUNCTION public.calculate_extraction_score(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  usage_count integer;
BEGIN
  SELECT count(*) INTO usage_count
  FROM public.strategic_usage_logs
  WHERE user_id = p_user
    AND created_at > now() - interval '1 hour';

  IF usage_count > 20 THEN
    RETURN 80;
  ELSIF usage_count > 10 THEN
    RETURN 50;
  ELSE
    RETURN 10;
  END IF;
END;
$$;
