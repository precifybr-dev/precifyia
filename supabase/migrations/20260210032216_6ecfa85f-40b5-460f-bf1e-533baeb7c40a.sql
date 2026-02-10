
-- Add mfa_verified_at column to user_security
ALTER TABLE public.user_security
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.user_security.mfa_verified_at IS 'Timestamp of last MFA verification via Google re-auth. Used to expire admin sessions.';
