
-- ========================================================
-- RBAC POR LOJA: store_members + funções de validação
-- ========================================================

-- 1. Enum de papéis de loja
CREATE TYPE public.store_role AS ENUM ('owner', 'admin', 'viewer');

-- 2. Permissões configuráveis para viewers
CREATE TYPE public.store_permission AS ENUM (
  'view_recipes',
  'view_ingredients', 
  'view_beverages',
  'view_financials',
  'view_costs',
  'view_dre',
  'view_sub_recipes'
);

-- 3. Tabela de membros da loja
CREATE TABLE public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role store_role NOT NULL DEFAULT 'viewer',
  permissions store_permission[] DEFAULT '{}',
  invited_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- 4. RLS na tabela store_members
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Owner da loja pode ver e gerenciar membros
CREATE POLICY "Store owners can manage members"
  ON public.store_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_members.store_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_members.store_id
        AND user_id = auth.uid()
    )
  );

-- Membros podem ver sua própria entrada
CREATE POLICY "Members can view own membership"
  ON public.store_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Funções SECURITY DEFINER para validação no backend

-- Verificar se usuário tem acesso à loja (qualquer papel)
CREATE OR REPLACE FUNCTION public.has_store_access(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- É dono da loja
    SELECT 1 FROM public.stores
    WHERE id = _store_id AND user_id = _user_id
  ) OR EXISTS (
    -- É membro ativo da loja
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id
      AND user_id = _user_id
      AND is_active = true
  )
$$;

-- Obter papel do usuário na loja
CREATE OR REPLACE FUNCTION public.get_store_role(_user_id UUID, _store_id UUID)
RETURNS store_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Dono da loja = owner
      WHEN EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = _store_id AND user_id = _user_id
      ) THEN 'owner'::store_role
      -- Senão, busca papel no store_members
      ELSE (
        SELECT role FROM public.store_members
        WHERE store_id = _store_id
          AND user_id = _user_id
          AND is_active = true
        LIMIT 1
      )
    END
$$;

-- Verificar se pode ESCREVER na loja (owner + admin)
CREATE OR REPLACE FUNCTION public.can_write_store(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- É dono
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = _store_id AND user_id = _user_id
    )
    OR
    -- É admin ativo
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_id = _store_id
        AND user_id = _user_id
        AND role = 'admin'
        AND is_active = true
    )
$$;

-- Verificar se pode GERENCIAR a loja (apenas owner)
CREATE OR REPLACE FUNCTION public.can_manage_store(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = _store_id AND user_id = _user_id
  )
$$;

-- Verificar se viewer tem permissão específica
CREATE OR REPLACE FUNCTION public.viewer_has_permission(_user_id UUID, _store_id UUID, _permission store_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id
      AND user_id = _user_id
      AND role = 'viewer'
      AND is_active = true
      AND _permission = ANY(permissions)
  )
$$;

-- 6. Trigger de updated_at
CREATE TRIGGER update_store_members_updated_at
  BEFORE UPDATE ON public.store_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Prevenir que membros se auto-promovam
CREATE OR REPLACE FUNCTION public.prevent_store_member_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Não pode alterar próprio papel
  IF NEW.user_id = auth.uid() AND TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Não é permitido alterar seu próprio papel na loja';
  END IF;
  
  -- Não pode se adicionar como owner
  IF NEW.role = 'owner' THEN
    RAISE EXCEPTION 'O papel owner é atribuído automaticamente ao dono da loja';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_store_member_self_promotion_trigger
  BEFORE INSERT OR UPDATE ON public.store_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_store_member_self_promotion();

-- 8. Atualizar RLS das tabelas de dados para incluir membros da loja

-- INGREDIENTS: membros podem ler, owner+admin podem escrever
CREATE POLICY "Store members can view ingredients"
  ON public.ingredients
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage ingredients"
  ON public.ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can update ingredients"
  ON public.ingredients
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can delete ingredients"
  ON public.ingredients
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- RECIPES: mesma lógica
CREATE POLICY "Store members can view recipes"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage recipes"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can update recipes"
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can delete recipes"
  ON public.recipes
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- BEVERAGES
CREATE POLICY "Store members can view beverages"
  ON public.beverages
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage beverages"
  ON public.beverages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can update beverages"
  ON public.beverages
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can delete beverages"
  ON public.beverages
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- SUB_RECIPES
CREATE POLICY "Store members can view sub_recipes"
  ON public.sub_recipes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage sub_recipes"
  ON public.sub_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can update sub_recipes"
  ON public.sub_recipes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can delete sub_recipes"
  ON public.sub_recipes
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- FIXED_COSTS
CREATE POLICY "Store members can view fixed_costs"
  ON public.fixed_costs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage fixed_costs"
  ON public.fixed_costs
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- VARIABLE_COSTS
CREATE POLICY "Store members can view variable_costs"
  ON public.variable_costs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage variable_costs"
  ON public.variable_costs
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- FIXED_EXPENSES
CREATE POLICY "Store members can view fixed_expenses"
  ON public.fixed_expenses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage fixed_expenses"
  ON public.fixed_expenses
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- VARIABLE_EXPENSES
CREATE POLICY "Store members can view variable_expenses"
  ON public.variable_expenses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage variable_expenses"
  ON public.variable_expenses
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- BUSINESS_TAXES
CREATE POLICY "Store members can view business_taxes"
  ON public.business_taxes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage business_taxes"
  ON public.business_taxes
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- CARD_FEES
CREATE POLICY "Store members can view card_fees"
  ON public.card_fees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage card_fees"
  ON public.card_fees
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );

-- MONTHLY_REVENUES
CREATE POLICY "Store members can view monthly_revenues"
  ON public.monthly_revenues
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Store writers can manage monthly_revenues"
  ON public.monthly_revenues
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.can_write_store(auth.uid(), store_id)
  );
