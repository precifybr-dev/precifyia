
-- Add store_id to combo_memory for per-store isolation
ALTER TABLE public.combo_memory ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add new columns for richer memory
ALTER TABLE public.combo_memory ADD COLUMN IF NOT EXISTS faixa_preco_min NUMERIC DEFAULT 0;
ALTER TABLE public.combo_memory ADD COLUMN IF NOT EXISTS faixa_preco_max NUMERIC DEFAULT 0;
ALTER TABLE public.combo_memory ADD COLUMN IF NOT EXISTS total_combos_criados INTEGER DEFAULT 0;
ALTER TABLE public.combo_memory ADD COLUMN IF NOT EXISTS padroes_montagem JSONB DEFAULT '[]'::jsonb;

-- Drop old unique constraint on user_id only (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'combo_memory_user_id_key'
  ) THEN
    ALTER TABLE public.combo_memory DROP CONSTRAINT combo_memory_user_id_key;
  END IF;
END$$;

-- Add new unique constraint on user_id + store_id
ALTER TABLE public.combo_memory ADD CONSTRAINT combo_memory_user_store_unique UNIQUE (user_id, store_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_combo_memory_user_store ON public.combo_memory(user_id, store_id);
