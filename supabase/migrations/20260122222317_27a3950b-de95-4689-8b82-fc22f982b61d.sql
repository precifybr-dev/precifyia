-- Create variable expenses table
CREATE TABLE public.variable_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variable_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own variable expenses" 
ON public.variable_expenses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variable expenses" 
ON public.variable_expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variable expenses" 
ON public.variable_expenses 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variable expenses" 
ON public.variable_expenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_variable_expenses_updated_at
BEFORE UPDATE ON public.variable_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.variable_expenses IS 'Despesas variáveis mensais do usuário (cartão, comissões, taxas, etc.)';
