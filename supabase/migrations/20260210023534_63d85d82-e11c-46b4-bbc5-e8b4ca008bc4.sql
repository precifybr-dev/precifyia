
-- Transactional function: creates collaborator + role + security in one transaction
-- If ANY step fails, the entire operation rolls back automatically
CREATE OR REPLACE FUNCTION public.create_collaborator_atomic(
  _user_id UUID,
  _role TEXT,
  _name TEXT,
  _email TEXT,
  _created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSONB;
BEGIN
  -- Validate inputs before any write
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;
  IF _role IS NULL OR _role = '' THEN
    RAISE EXCEPTION 'role é obrigatória';
  END IF;
  IF _role = 'master' THEN
    RAISE EXCEPTION 'Não é permitido criar colaborador master via esta função';
  END IF;
  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  IF _email IS NULL OR trim(_email) = '' THEN
    RAISE EXCEPTION 'Email é obrigatório';
  END IF;

  -- Step 1: Insert collaborator
  INSERT INTO public.collaborators (user_id, role, name, email, is_active, created_by)
  VALUES (_user_id, _role::app_role, _name, _email, true, _created_by);

  -- Step 2: Insert user role
  INSERT INTO public.user_roles (user_id, role, is_protected)
  VALUES (_user_id, _role::app_role, false);

  -- Step 3: Insert user security
  INSERT INTO public.user_security (user_id, must_change_password, mfa_enabled)
  VALUES (_user_id, true, false);

  _result := jsonb_build_object(
    'success', true,
    'user_id', _user_id,
    'role', _role
  );

  RETURN _result;
END;
$$;

-- Transactional function: updates collaborator + role atomically
CREATE OR REPLACE FUNCTION public.update_collaborator_atomic(
  _collaborator_id UUID,
  _name TEXT DEFAULT NULL,
  _role TEXT DEFAULT NULL,
  _is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _collab RECORD;
  _update_fields JSONB := '{}'::JSONB;
BEGIN
  -- Fetch collaborator first
  SELECT id, user_id, role INTO _collab
  FROM public.collaborators
  WHERE id = _collaborator_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF _collab.role = 'master' THEN
    RAISE EXCEPTION 'Não é possível alterar o usuário master';
  END IF;

  IF _role = 'master' THEN
    RAISE EXCEPTION 'Não é possível promover para master';
  END IF;

  -- Build update dynamically
  IF _name IS NOT NULL THEN
    UPDATE public.collaborators SET name = _name WHERE id = _collaborator_id;
  END IF;

  IF _is_active IS NOT NULL THEN
    UPDATE public.collaborators SET is_active = _is_active WHERE id = _collaborator_id;
  END IF;

  IF _role IS NOT NULL THEN
    -- Update both tables atomically
    UPDATE public.collaborators SET role = _role::app_role WHERE id = _collaborator_id;
    UPDATE public.user_roles SET role = _role::app_role WHERE user_id = _collab.user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
