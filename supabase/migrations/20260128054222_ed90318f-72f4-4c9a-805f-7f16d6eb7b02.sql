-- Add business_type column to stores table for store categorization
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS business_type text;