
CREATE UNIQUE INDEX ifood_monthly_metrics_user_store_comp_key
  ON public.ifood_monthly_metrics (user_id, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'), competencia);
