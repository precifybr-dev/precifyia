
-- Add column for custom anticipation rate (editable by user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ifood_anticipation_rate numeric DEFAULT 1.99;
