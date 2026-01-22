-- Add configurable cost limit percentage to profiles
ALTER TABLE public.profiles 
ADD COLUMN cost_limit_percent numeric DEFAULT 40;