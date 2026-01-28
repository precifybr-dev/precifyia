-- ============================================
-- PROTEÇÃO CONTRA AUTO-ELEVAÇÃO DE PRIVILÉGIOS
-- ============================================

-- Função para verificar se o usuário atual é master
CREATE OR REPLACE FUNCTION public.current_user_is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master'
      AND is_protected = true
  )
$$;

-- Função para prevenir auto-elevação em user_roles
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário está tentando se auto-promover
  IF NEW.user_id = auth.uid() AND NEW.role IN ('master', 'admin') THEN
    -- Apenas service_role pode fazer isso (usado em edge functions)
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Auto-elevação de privilégios não permitida';
    END IF;
  END IF;

  -- Verificar se está tentando criar um master sem ser service_role
  IF NEW.role = 'master' AND NEW.is_protected = true THEN
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Não é possível criar usuário master protegido';
    END IF;
  END IF;

  -- Prevenir alteração da role master protegida
  IF TG_OP = 'UPDATE' AND OLD.role = 'master' AND OLD.is_protected = true THEN
    IF NEW.role != 'master' OR NEW.is_protected != true THEN
      RAISE EXCEPTION 'Não é possível alterar a role do master protegido';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para prevenir auto-elevação em user_roles
DROP TRIGGER IF EXISTS prevent_privilege_escalation_roles_trigger ON public.user_roles;
CREATE TRIGGER prevent_privilege_escalation_roles_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation_roles();

-- Função para prevenir auto-elevação em user_permissions
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário está tentando dar permissões a si mesmo
  IF NEW.user_id = auth.uid() THEN
    -- Apenas service_role pode fazer isso
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Não é permitido conceder permissões a si mesmo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para prevenir auto-elevação em user_permissions
DROP TRIGGER IF EXISTS prevent_privilege_escalation_permissions_trigger ON public.user_permissions;
CREATE TRIGGER prevent_privilege_escalation_permissions_trigger
  BEFORE INSERT OR UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation_permissions();

-- Função para prevenir colaboradores de se auto-promoverem
CREATE OR REPLACE FUNCTION public.prevent_collaborator_self_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se está tentando se auto-promover
  IF NEW.user_id = auth.uid() AND TG_OP = 'INSERT' THEN
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Não é permitido criar colaborador para si mesmo';
    END IF;
  END IF;

  -- Verificar se está tentando alterar própria role
  IF NEW.user_id = auth.uid() AND TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Não é permitido alterar sua própria role';
      END IF;
    END IF;
  END IF;

  -- Prevenir promoção para master
  IF NEW.role = 'master' AND TG_OP = 'INSERT' THEN
    -- Verificar se já existe um master no sistema
    IF EXISTS (SELECT 1 FROM public.collaborators WHERE role = 'master' AND id != COALESCE(OLD.id, NEW.id)) THEN
      IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Já existe um usuário master no sistema';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para prevenir auto-promoção em collaborators
DROP TRIGGER IF EXISTS prevent_collaborator_self_promotion_trigger ON public.collaborators;
CREATE TRIGGER prevent_collaborator_self_promotion_trigger
  BEFORE INSERT OR UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_collaborator_self_promotion();

-- Função para registrar tentativas de elevação de privilégio
CREATE OR REPLACE FUNCTION public.log_privilege_escalation_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar tentativa em admin_audit_logs
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    target_user_id,
    action,
    action_type,
    old_value,
    new_value
  ) VALUES (
    auth.uid(),
    NEW.user_id,
    'privilege_escalation_attempt',
    'security',
    to_jsonb(OLD),
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

-- Garantir que apenas master pode inserir/deletar roles administrativas
DROP POLICY IF EXISTS "Only masters can insert admin roles" ON public.user_roles;
CREATE POLICY "Only masters can insert admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Usuário pode inserir role 'user' para si mesmo (registro normal)
  (role = 'user' AND user_id = auth.uid())
  OR
  -- Ou master pode inserir qualquer role (exceto master protegido, que é controlado pelo trigger)
  is_master(auth.uid())
);

-- Garantir que apenas master pode atualizar roles
DROP POLICY IF EXISTS "Only masters can update roles" ON public.user_roles;
CREATE POLICY "Only masters can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Garantir que apenas master pode deletar roles (exceto protegidas)
DROP POLICY IF EXISTS "Only masters can delete non-protected roles" ON public.user_roles;
CREATE POLICY "Only masters can delete non-protected roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  is_master(auth.uid()) 
  AND is_protected = false
);

-- Atualizar política de inserção em user_permissions
DROP POLICY IF EXISTS "Only masters can grant permissions" ON public.user_permissions;
CREATE POLICY "Only masters can grant permissions"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (is_master(auth.uid()) AND user_id != auth.uid());

-- Atualizar política de update em user_permissions  
DROP POLICY IF EXISTS "Only masters can update permissions" ON public.user_permissions;
CREATE POLICY "Only masters can update permissions"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Atualizar política de delete em user_permissions
DROP POLICY IF EXISTS "Only masters can revoke permissions" ON public.user_permissions;
CREATE POLICY "Only masters can revoke permissions"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (is_master(auth.uid()));