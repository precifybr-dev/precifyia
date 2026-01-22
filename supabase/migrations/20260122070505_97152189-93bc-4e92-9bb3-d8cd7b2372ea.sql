-- Remover a coluna gerada existente
ALTER TABLE public.ingredients DROP COLUMN unit_price;

-- Recriar com a fórmula correta incluindo correction_factor
ALTER TABLE public.ingredients ADD COLUMN unit_price NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN purchase_quantity > 0 THEN 
      ROUND((purchase_price / purchase_quantity) * COALESCE(correction_factor, 1), 2)
    ELSE 0 
  END
) STORED;