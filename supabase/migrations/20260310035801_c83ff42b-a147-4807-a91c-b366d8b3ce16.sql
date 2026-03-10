-- Drop the old unique constraint (it's a constraint, not just an index)
ALTER TABLE public.ifood_monthly_metrics 
  DROP CONSTRAINT IF EXISTS ifood_monthly_metrics_user_id_store_id_competencia_key;