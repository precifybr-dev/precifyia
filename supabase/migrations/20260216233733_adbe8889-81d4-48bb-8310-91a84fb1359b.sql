CREATE OR REPLACE FUNCTION prevent_calculation_history_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Registros de calculo historico sao imutaveis e nao podem ser alterados.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_calculation_history ON calculation_history;

CREATE TRIGGER immutable_calculation_history
  BEFORE UPDATE ON calculation_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_calculation_history_modification();