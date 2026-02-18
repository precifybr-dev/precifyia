ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS default_cmv numeric;

UPDATE public.stores s
SET default_cmv = p.default_cmv
FROM public.profiles p
WHERE s.user_id = p.user_id AND s.is_default = true AND p.default_cmv IS NOT NULL;