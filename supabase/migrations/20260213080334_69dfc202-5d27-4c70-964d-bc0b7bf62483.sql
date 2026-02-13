
-- FIX 1: rate_limit_entries — bloquear acesso total (só service_role opera)
DROP POLICY IF EXISTS "Block all access to rate limit entries" ON public.rate_limit_entries;
CREATE POLICY "Block all access to rate limit entries"
  ON public.rate_limit_entries
  FOR ALL
  TO authenticated
  USING (false);

-- FIX 2: admin_audit_logs — restringir SELECT a master/admin
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- FIX 3: user_roles — restringir leitura ao próprio usuário ou admin
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- FIX 4: support_consent — restringir ao próprio usuário ou admin
DROP POLICY IF EXISTS "Users can view own consent" ON public.support_consent;
CREATE POLICY "Users can view own consent"
  ON public.support_consent
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- FIX 5: commission_config — restringir a master
DROP POLICY IF EXISTS "Only master can view commission config" ON public.commission_config;
CREATE POLICY "Only master can view commission config"
  ON public.commission_config
  FOR SELECT
  USING (public.has_role(auth.uid(), 'master'));

-- FIX 6: monetization_settings — restringir a master
DROP POLICY IF EXISTS "Only master can view monetization settings" ON public.monetization_settings;
CREATE POLICY "Only master can view monetization settings"
  ON public.monetization_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'master'));
