
CREATE OR REPLACE FUNCTION public.check_rate_limit_global(
  p_user uuid,
  p_ip text,
  p_fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total integer;
BEGIN
  SELECT count(*) INTO total
  FROM public.rate_limit_global
  WHERE created_at > now() - interval '5 minutes'
    AND (
      user_id = p_user
      OR ip = p_ip
      OR fingerprint_hash = p_fingerprint
    );

  IF total > 15 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
