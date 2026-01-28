-- Primeiro, adicionar os novos valores ao enum (precisam ser commitados antes de usar)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suporte';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analista';