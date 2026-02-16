ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS menu_cache jsonb,
  ADD COLUMN IF NOT EXISTS menu_cached_at timestamptz;