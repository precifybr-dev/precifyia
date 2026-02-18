
-- ============================================
-- MÓDULO DE COMPARTILHAMENTO DE CUSTOS (PRO)
-- ============================================

-- 1. Tabela: sharing_groups
CREATE TABLE public.sharing_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  division_type text NOT NULL DEFAULT 'equal',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sharing_groups_division_type_check CHECK (division_type IN ('equal', 'manual'))
);

ALTER TABLE public.sharing_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can do everything with sharing_groups"
  ON public.sharing_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Tabela: sharing_group_stores
CREATE TABLE public.sharing_group_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sharing_group_id uuid NOT NULL REFERENCES public.sharing_groups(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  percentage numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sharing_group_id, store_id)
);

ALTER TABLE public.sharing_group_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sharing_group_stores"
  ON public.sharing_group_stores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sharing_groups sg
      WHERE sg.id = sharing_group_id AND sg.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sharing_groups sg
      WHERE sg.id = sharing_group_id AND sg.user_id = auth.uid()
    )
  );

-- 3. Alterar stores: adicionar sharing_group_id
ALTER TABLE public.stores
  ADD COLUMN sharing_group_id uuid NULL REFERENCES public.sharing_groups(id) ON DELETE SET NULL;

-- 4. Alterar fixed_expenses: adicionar cost_type e sharing_group_id
ALTER TABLE public.fixed_expenses
  ADD COLUMN cost_type text NOT NULL DEFAULT 'exclusive',
  ADD COLUMN sharing_group_id uuid NULL REFERENCES public.sharing_groups(id) ON DELETE SET NULL;

ALTER TABLE public.fixed_expenses
  ADD CONSTRAINT fixed_expenses_cost_type_check CHECK (cost_type IN ('exclusive', 'shared'));

-- 5. Tabela: cost_allocations
CREATE TABLE public.cost_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.fixed_expenses(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reference_month text NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0,
  division_type text NOT NULL DEFAULT 'equal',
  total_stores integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expense_id, store_id, reference_month)
);

ALTER TABLE public.cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage cost_allocations"
  ON public.cost_allocations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = cost_allocations.store_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = cost_allocations.store_id AND s.user_id = auth.uid()
    )
  );

-- 6. Índices
CREATE INDEX idx_sharing_group_stores_group ON public.sharing_group_stores(sharing_group_id);
CREATE INDEX idx_sharing_group_stores_store ON public.sharing_group_stores(store_id);
CREATE INDEX idx_cost_allocations_expense ON public.cost_allocations(expense_id);
CREATE INDEX idx_cost_allocations_store_month ON public.cost_allocations(store_id, reference_month);
CREATE INDEX idx_fixed_expenses_cost_type ON public.fixed_expenses(cost_type);
CREATE INDEX idx_fixed_expenses_sharing_group ON public.fixed_expenses(sharing_group_id);
CREATE INDEX idx_stores_sharing_group ON public.stores(sharing_group_id);

-- 7. Trigger: validar integridade de despesas compartilhadas
CREATE OR REPLACE FUNCTION public.validate_shared_expense_integrity()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cost_type = 'shared' THEN
    IF NEW.store_id IS NOT NULL THEN
      RAISE EXCEPTION 'Despesa compartilhada não pode ter store_id. Ela pertence ao grupo.';
    END IF;
    IF NEW.sharing_group_id IS NULL THEN
      RAISE EXCEPTION 'Despesa compartilhada deve ter um sharing_group_id válido.';
    END IF;
  END IF;

  IF NEW.cost_type = 'exclusive' THEN
    IF NEW.sharing_group_id IS NOT NULL THEN
      RAISE EXCEPTION 'Despesa exclusiva não pode ter sharing_group_id.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_shared_expense
  BEFORE INSERT OR UPDATE ON public.fixed_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shared_expense_integrity();

-- 8. Função de recálculo automático
CREATE OR REPLACE FUNCTION public.recalculate_shared_costs(p_group_id uuid, p_ref_month text DEFAULT NULL)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_month text;
  v_store_count integer;
  v_division_type text;
  v_expense RECORD;
BEGIN
  -- Usar mês atual se não especificado
  v_ref_month := COALESCE(p_ref_month, to_char(now(), 'YYYY-MM'));

  -- Buscar tipo de divisão do grupo
  SELECT division_type INTO v_division_type
  FROM public.sharing_groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Contar lojas no grupo
  SELECT count(*) INTO v_store_count
  FROM public.sharing_group_stores
  WHERE sharing_group_id = p_group_id;

  IF v_store_count = 0 THEN
    RETURN;
  END IF;

  -- Deletar alocações do mês atual para despesas deste grupo
  DELETE FROM public.cost_allocations
  WHERE reference_month = v_ref_month
    AND expense_id IN (
      SELECT id FROM public.fixed_expenses
      WHERE sharing_group_id = p_group_id AND cost_type = 'shared'
    );

  -- Recalcular para cada despesa compartilhada
  FOR v_expense IN
    SELECT id, monthly_value
    FROM public.fixed_expenses
    WHERE sharing_group_id = p_group_id AND cost_type = 'shared'
  LOOP
    INSERT INTO public.cost_allocations (expense_id, store_id, reference_month, allocated_amount, division_type, total_stores)
    SELECT
      v_expense.id,
      sgs.store_id,
      v_ref_month,
      ROUND(v_expense.monthly_value / v_store_count, 2),
      v_division_type,
      v_store_count
    FROM public.sharing_group_stores sgs
    WHERE sgs.sharing_group_id = p_group_id
    ON CONFLICT (expense_id, store_id, reference_month)
    DO UPDATE SET
      allocated_amount = EXCLUDED.allocated_amount,
      division_type = EXCLUDED.division_type,
      total_stores = EXCLUDED.total_stores;
  END LOOP;
END;
$function$;

-- 9. Trigger: recalcular quando loja entra/sai do grupo
CREATE OR REPLACE FUNCTION public.trigger_recalc_on_group_store_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.sharing_group_id;
  ELSE
    v_group_id := NEW.sharing_group_id;
  END IF;

  PERFORM public.recalculate_shared_costs(v_group_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_recalc_group_store_change
  AFTER INSERT OR DELETE ON public.sharing_group_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_on_group_store_change();

-- 10. Trigger: recalcular quando despesa compartilhada muda
CREATE OR REPLACE FUNCTION public.trigger_recalc_on_shared_expense_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cost_type = 'shared' AND NEW.sharing_group_id IS NOT NULL THEN
    PERFORM public.recalculate_shared_costs(NEW.sharing_group_id);
  END IF;

  -- Se mudou de shared para exclusive, limpar alocações do mês atual
  IF TG_OP = 'UPDATE' AND OLD.cost_type = 'shared' AND NEW.cost_type = 'exclusive' THEN
    DELETE FROM public.cost_allocations
    WHERE expense_id = NEW.id
      AND reference_month = to_char(now(), 'YYYY-MM');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_recalc_shared_expense_change
  AFTER INSERT OR UPDATE OF monthly_value, cost_type, sharing_group_id ON public.fixed_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_on_shared_expense_change();

-- 11. Trigger: proteger histórico de meses anteriores
CREATE OR REPLACE FUNCTION public.protect_cost_allocation_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    IF OLD.reference_month < to_char(now(), 'YYYY-MM') THEN
      RAISE EXCEPTION 'Alocações de meses anteriores são imutáveis e não podem ser alteradas.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_protect_cost_allocation_history
  BEFORE UPDATE OR DELETE ON public.cost_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_cost_allocation_history();
