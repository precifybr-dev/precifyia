-- Add iFood pricing fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ifood_plan_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_base_rate numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_offers_coupon boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ifood_coupon_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_coupon_type text DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS ifood_has_delivery_fee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ifood_delivery_fee numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_delivery_absorber text DEFAULT 'client',
ADD COLUMN IF NOT EXISTS ifood_real_percentage numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.ifood_plan_type IS 'Type of iFood plan: own_delivery or ifood_delivery';
COMMENT ON COLUMN public.profiles.ifood_base_rate IS 'Base iFood commission rate in percentage';
COMMENT ON COLUMN public.profiles.ifood_offers_coupon IS 'Whether business offers coupons on iFood';
COMMENT ON COLUMN public.profiles.ifood_coupon_value IS 'Coupon value (fixed R$ or percentage)';
COMMENT ON COLUMN public.profiles.ifood_coupon_type IS 'Coupon type: fixed or percent';
COMMENT ON COLUMN public.profiles.ifood_has_delivery_fee IS 'Whether there is a delivery fee';
COMMENT ON COLUMN public.profiles.ifood_delivery_fee IS 'Delivery fee value in R$';
COMMENT ON COLUMN public.profiles.ifood_delivery_absorber IS 'Who absorbs delivery fee: client or business';
COMMENT ON COLUMN public.profiles.ifood_real_percentage IS 'Calculated real iFood percentage for pricing';