
ALTER TABLE public.stores
ADD COLUMN menu_analysis jsonb DEFAULT NULL,
ADD COLUMN menu_analysis_at timestamptz DEFAULT NULL;
