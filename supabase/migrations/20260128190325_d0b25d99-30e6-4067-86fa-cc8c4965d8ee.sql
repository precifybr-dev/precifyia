
-- Remove the old check constraint and add owner as valid plan
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_plan_check;

-- Add new check constraint including 'owner'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_plan_check 
CHECK (user_plan IN ('free', 'basic', 'pro', 'owner'));
