
CREATE OR REPLACE FUNCTION public.update_risk_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  score integer;
BEGIN
  score := public.calculate_extraction_score(NEW.user_id);

  INSERT INTO public.risk_flags (user_id, risk_score, shadow_banned)
  VALUES (
    NEW.user_id,
    score,
    score >= 70
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    risk_score = score,
    shadow_banned = score >= 70,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER strategic_risk_trigger
AFTER INSERT ON public.strategic_usage_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_risk_score();
