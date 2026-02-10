
-- ═══════════════════════════════════════════════════
-- Validation triggers for recipes and recipe_ingredients
-- These prevent invalid data from being saved even if
-- someone bypasses the edge function.
-- ═══════════════════════════════════════════════════

-- 1. Validate recipe data before insert/update
CREATE OR REPLACE FUNCTION public.validate_recipe_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Name required
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome da receita é obrigatório.';
  END IF;
  IF length(trim(NEW.name)) > 200 THEN
    RAISE EXCEPTION 'Nome da receita deve ter no máximo 200 caracteres.';
  END IF;

  -- Servings must be positive integer
  IF NEW.servings IS NULL OR NEW.servings <= 0 THEN
    RAISE EXCEPTION 'Porções deve ser um número inteiro maior que zero.';
  END IF;

  -- total_cost cannot be negative
  IF NEW.total_cost IS NOT NULL AND NEW.total_cost < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (total_cost)';
  END IF;

  -- cost_per_serving cannot be negative
  IF NEW.cost_per_serving IS NOT NULL AND NEW.cost_per_serving < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (cost_per_serving)';
  END IF;

  -- suggested_price cannot be negative
  IF NEW.suggested_price IS NOT NULL AND NEW.suggested_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (suggested_price)';
  END IF;

  -- selling_price cannot be negative (can be null)
  IF NEW.selling_price IS NOT NULL AND NEW.selling_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (selling_price)';
  END IF;

  -- ifood_selling_price cannot be negative (can be null)
  IF NEW.ifood_selling_price IS NOT NULL AND NEW.ifood_selling_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (ifood_selling_price)';
  END IF;

  -- cmv_target must be between 0 and 100 exclusive
  IF NEW.cmv_target IS NOT NULL AND (NEW.cmv_target <= 0 OR NEW.cmv_target >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (cmv_target: 0-100)';
  END IF;

  -- Block NaN/Infinity via text cast (Postgres doesn't allow NaN in numeric but guards anyway)
  IF NEW.total_cost = 'NaN'::numeric OR NEW.cost_per_serving = 'NaN'::numeric 
     OR NEW.suggested_price = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Valores numéricos inválidos detectados.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recipe ON public.recipes;
CREATE TRIGGER trg_validate_recipe
  BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recipe_data();

-- 2. Validate recipe_ingredients data
CREATE OR REPLACE FUNCTION public.validate_recipe_ingredient_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- quantity must be positive
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade do insumo deve ser maior que zero.';
  END IF;

  -- cost cannot be negative
  IF NEW.cost IS NOT NULL AND NEW.cost < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (cost)';
  END IF;

  -- unit required
  IF NEW.unit IS NULL OR trim(NEW.unit) = '' THEN
    RAISE EXCEPTION 'Unidade do insumo é obrigatória.';
  END IF;

  -- ingredient_id required
  IF NEW.ingredient_id IS NULL THEN
    RAISE EXCEPTION 'Cada insumo deve ter um identificador válido.';
  END IF;

  -- recipe_id required
  IF NEW.recipe_id IS NULL THEN
    RAISE EXCEPTION 'Receita é obrigatória.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recipe_ingredient ON public.recipe_ingredients;
CREATE TRIGGER trg_validate_recipe_ingredient
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recipe_ingredient_data();

-- 3. Validate ingredients table (purchase data)
CREATE OR REPLACE FUNCTION public.validate_ingredient_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Name required
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome do insumo é obrigatório.';
  END IF;

  -- purchase_price cannot be negative
  IF NEW.purchase_price IS NOT NULL AND NEW.purchase_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (purchase_price)';
  END IF;

  -- purchase_quantity must be positive
  IF NEW.purchase_quantity IS NOT NULL AND NEW.purchase_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade de compra deve ser maior que zero.';
  END IF;

  -- unit_price cannot be negative
  IF NEW.unit_price IS NOT NULL AND NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (unit_price)';
  END IF;

  -- correction_factor must be positive if set
  IF NEW.correction_factor IS NOT NULL AND NEW.correction_factor <= 0 THEN
    RAISE EXCEPTION 'Fator de correção deve ser maior que zero.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ingredient ON public.ingredients;
CREATE TRIGGER trg_validate_ingredient
  BEFORE INSERT OR UPDATE ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ingredient_data();

-- 4. Validate business financial data (profiles)
CREATE OR REPLACE FUNCTION public.validate_profile_financial_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- monthly_revenue cannot be negative
  IF NEW.monthly_revenue IS NOT NULL AND NEW.monthly_revenue < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (monthly_revenue)';
  END IF;

  -- default_cmv must be between 0 and 100
  IF NEW.default_cmv IS NOT NULL AND (NEW.default_cmv <= 0 OR NEW.default_cmv >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (default_cmv)';
  END IF;

  -- cost_limit_percent must be between 0 and 100
  IF NEW.cost_limit_percent IS NOT NULL AND (NEW.cost_limit_percent <= 0 OR NEW.cost_limit_percent > 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (cost_limit_percent)';
  END IF;

  -- ifood_real_percentage cannot be negative or >= 100
  IF NEW.ifood_real_percentage IS NOT NULL AND (NEW.ifood_real_percentage < 0 OR NEW.ifood_real_percentage >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (ifood_real_percentage)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_financial ON public.profiles;
CREATE TRIGGER trg_validate_profile_financial
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_financial_data();

-- 5. Validate fixed/variable costs and expenses
CREATE OR REPLACE FUNCTION public.validate_cost_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Name required
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório.';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to fixed_costs (value_per_item can be 0 but not negative)
CREATE OR REPLACE FUNCTION public.validate_cost_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.value_per_item IS NOT NULL AND NEW.value_per_item < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (value_per_item)';
  END IF;
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_fixed_cost ON public.fixed_costs;
CREATE TRIGGER trg_validate_fixed_cost
  BEFORE INSERT OR UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_cost_value();

DROP TRIGGER IF EXISTS trg_validate_variable_cost ON public.variable_costs;
CREATE TRIGGER trg_validate_variable_cost
  BEFORE INSERT OR UPDATE ON public.variable_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_cost_value();

-- Expenses (monthly_value)
CREATE OR REPLACE FUNCTION public.validate_expense_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.monthly_value IS NOT NULL AND NEW.monthly_value < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (monthly_value)';
  END IF;
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_fixed_expense ON public.fixed_expenses;
CREATE TRIGGER trg_validate_fixed_expense
  BEFORE INSERT OR UPDATE ON public.fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_value();

DROP TRIGGER IF EXISTS trg_validate_variable_expense ON public.variable_expenses;
CREATE TRIGGER trg_validate_variable_expense
  BEFORE INSERT OR UPDATE ON public.variable_expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_value();

-- 6. Validate business_taxes
CREATE OR REPLACE FUNCTION public.validate_tax_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.tax_percentage IS NOT NULL AND (NEW.tax_percentage < 0 OR NEW.tax_percentage >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (tax_percentage: 0-99.99)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_business_tax ON public.business_taxes;
CREATE TRIGGER trg_validate_business_tax
  BEFORE INSERT OR UPDATE ON public.business_taxes
  FOR EACH ROW EXECUTE FUNCTION public.validate_tax_data();

-- 7. Validate card_fees
CREATE OR REPLACE FUNCTION public.validate_card_fee_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.fee_percentage IS NOT NULL AND (NEW.fee_percentage < 0 OR NEW.fee_percentage >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (fee_percentage: 0-99.99)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_card_fee ON public.card_fees;
CREATE TRIGGER trg_validate_card_fee
  BEFORE INSERT OR UPDATE ON public.card_fees
  FOR EACH ROW EXECUTE FUNCTION public.validate_card_fee_data();

-- 8. Validate beverages
CREATE OR REPLACE FUNCTION public.validate_beverage_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Nome da bebida é obrigatório.';
  END IF;
  IF NEW.purchase_price IS NOT NULL AND NEW.purchase_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (purchase_price)';
  END IF;
  IF NEW.purchase_quantity IS NOT NULL AND NEW.purchase_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade de compra deve ser maior que zero.';
  END IF;
  IF NEW.selling_price IS NOT NULL AND NEW.selling_price < 0 THEN
    RAISE EXCEPTION 'Este campo não pode conter valores negativos ou vazios. (selling_price)';
  END IF;
  IF NEW.cmv_target IS NOT NULL AND (NEW.cmv_target <= 0 OR NEW.cmv_target >= 100) THEN
    RAISE EXCEPTION 'O percentual informado está fora do intervalo permitido. (cmv_target)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_beverage ON public.beverages;
CREATE TRIGGER trg_validate_beverage
  BEFORE INSERT OR UPDATE ON public.beverages
  FOR EACH ROW EXECUTE FUNCTION public.validate_beverage_data();
