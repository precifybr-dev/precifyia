CREATE OR REPLACE FUNCTION prevent_calculation_history_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Registros de calculo historico sao imutaveis e nao podem ser alterados.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;