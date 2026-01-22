-- Create table for monthly revenue records
CREATE TABLE public.monthly_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Enable RLS
ALTER TABLE public.monthly_revenues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own monthly revenues"
  ON public.monthly_revenues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly revenues"
  ON public.monthly_revenues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly revenues"
  ON public.monthly_revenues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly revenues"
  ON public.monthly_revenues FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_revenues_updated_at
  BEFORE UPDATE ON public.monthly_revenues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();