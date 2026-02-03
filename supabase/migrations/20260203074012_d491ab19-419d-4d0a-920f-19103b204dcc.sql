-- Create table for business tax configuration
CREATE TABLE public.business_taxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  tax_regime TEXT NOT NULL DEFAULT 'simples',
  tax_percentage NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Create table for card fees (multiple per store)
CREATE TABLE public.card_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'debit',
  fee_percentage NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on business_taxes
ALTER TABLE public.business_taxes ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_taxes
CREATE POLICY "Users can view their own business taxes"
ON public.business_taxes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business taxes"
ON public.business_taxes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business taxes"
ON public.business_taxes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business taxes"
ON public.business_taxes FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on card_fees
ALTER TABLE public.card_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_fees
CREATE POLICY "Users can view their own card fees"
ON public.card_fees FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card fees"
ON public.card_fees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card fees"
ON public.card_fees FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card fees"
ON public.card_fees FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_taxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_business_taxes_updated_at
BEFORE UPDATE ON public.business_taxes
FOR EACH ROW
EXECUTE FUNCTION public.update_taxes_updated_at();

CREATE TRIGGER update_card_fees_updated_at
BEFORE UPDATE ON public.card_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_taxes_updated_at();