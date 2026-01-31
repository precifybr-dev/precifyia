-- Create beverages table (similar to ingredients but for drinks)
CREATE TABLE public.beverages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  code SERIAL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  purchase_quantity NUMERIC NOT NULL DEFAULT 1,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC GENERATED ALWAYS AS (
    CASE WHEN purchase_quantity > 0 THEN purchase_price / purchase_quantity ELSE 0 END
  ) STORED,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  cmv_target NUMERIC DEFAULT 35,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for code per user
ALTER TABLE public.beverages ADD CONSTRAINT beverages_user_code_unique UNIQUE (user_id, code);

-- Enable Row Level Security
ALTER TABLE public.beverages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own beverages" 
ON public.beverages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beverages" 
ON public.beverages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beverages" 
ON public.beverages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beverages" 
ON public.beverages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beverages_updated_at
BEFORE UPDATE ON public.beverages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();