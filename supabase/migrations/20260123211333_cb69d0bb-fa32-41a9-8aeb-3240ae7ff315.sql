-- Create table to track iFood import usage per user
CREATE TABLE public.ifood_import_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('ingredients', 'recipes')),
  imported_count INTEGER NOT NULL DEFAULT 0,
  store_name TEXT,
  store_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ifood_import_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own imports" 
ON public.ifood_import_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imports" 
ON public.ifood_import_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add user_plan column to profiles for plan-based limits
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_plan TEXT DEFAULT 'free' CHECK (user_plan IN ('free', 'basic', 'pro'));

-- Create index for faster lookups
CREATE INDEX idx_ifood_import_usage_user_date ON public.ifood_import_usage (user_id, created_at DESC);