
-- Add referral_source to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source text;

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_profiles_referral_source ON public.profiles(referral_source);
