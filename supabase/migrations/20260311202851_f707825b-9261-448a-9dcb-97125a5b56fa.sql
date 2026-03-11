
-- 1. Garantir que o enum app_role existe
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'master', 'suporte', 'financeiro', 'analista');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Criar tabela admin_alerts se não existir
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  target_roles public.app_role[] DEFAULT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- 4. Policies idempotentes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_alerts' AND policyname = 'Masters and admins can view alerts') THEN
    CREATE POLICY "Masters and admins can view alerts" ON public.admin_alerts
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_alerts' AND policyname = 'Masters and admins can insert alerts') THEN
    CREATE POLICY "Masters and admins can insert alerts" ON public.admin_alerts
      FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_alerts' AND policyname = 'Masters and admins can update alerts') THEN
    CREATE POLICY "Masters and admins can update alerts" ON public.admin_alerts
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
