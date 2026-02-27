
-- Fix: set security_invoker = on so RLS of underlying tables applies to the querying user
CREATE OR REPLACE VIEW public.unified_products
WITH (security_invoker = on) AS
SELECT
  r.id,
  r.user_id,
  r.store_id,
  r.name,
  'receita'::text AS tipo,
  r.selling_price AS preco_venda,
  r.cost_per_serving AS custo_unitario,
  r.suggested_price AS preco_sugerido,
  r.ifood_selling_price,
  r.cmv_target,
  r.created_at,
  r.updated_at
FROM public.recipes r

UNION ALL

SELECT
  b.id,
  b.user_id,
  b.store_id,
  b.name,
  'bebida'::text AS tipo,
  b.selling_price AS preco_venda,
  b.unit_price AS custo_unitario,
  NULL::numeric AS preco_sugerido,
  b.ifood_selling_price,
  b.cmv_target,
  b.created_at,
  b.updated_at
FROM public.beverages b;
