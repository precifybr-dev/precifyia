-- Create table for Fixed Costs (Production - per item)
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  value_per_item NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fixed_costs
CREATE POLICY "Users can view their own fixed costs"
  ON public.fixed_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed costs"
  ON public.fixed_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed costs"
  ON public.fixed_costs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed costs"
  ON public.fixed_costs FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for Variable Costs (Production - per item)
CREATE TABLE public.variable_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  value_per_item NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variable_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for variable_costs
CREATE POLICY "Users can view their own variable costs"
  ON public.variable_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variable costs"
  ON public.variable_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variable costs"
  ON public.variable_costs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variable costs"
  ON public.variable_costs FOR DELETE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_fixed_costs_updated_at
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_variable_costs_updated_at
  BEFORE UPDATE ON public.variable_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();