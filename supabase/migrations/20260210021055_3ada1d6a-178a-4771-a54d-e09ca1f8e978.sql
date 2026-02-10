
-- ========================================================
-- RATE LIMITING: tabela + função atômica
-- ========================================================

-- 1. Tabela para rastrear requisições
CREATE TABLE public.rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca rápida por chave + endpoint + janela ativa
CREATE INDEX idx_rate_limit_key_endpoint ON public.rate_limit_entries (key, endpoint, window_start);

-- Índice para limpeza de entradas antigas
CREATE INDEX idx_rate_limit_cleanup ON public.rate_limit_entries (window_start);

-- RLS: apenas service_role acessa
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
-- Sem policies = nenhum acesso via anon/authenticated (só service_role bypassa RLS)

-- 2. Função atômica de rate limiting
-- Retorna: allowed (boolean), remaining (int), retry_after_seconds (int)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _endpoint TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER DEFAULT 60,
  _block_seconds INTEGER DEFAULT 120
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _window_start TIMESTAMPTZ := _now - (_window_seconds || ' seconds')::INTERVAL;
  _entry RECORD;
  _current_count INTEGER;
BEGIN
  -- Check if currently blocked
  SELECT re.blocked_until INTO _entry
  FROM public.rate_limit_entries re
  WHERE re.key = _key
    AND re.endpoint = _endpoint
    AND re.blocked_until IS NOT NULL
    AND re.blocked_until > _now
  ORDER BY re.blocked_until DESC
  LIMIT 1;

  IF FOUND AND _entry.blocked_until > _now THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      0::INTEGER,
      EXTRACT(EPOCH FROM (_entry.blocked_until - _now))::INTEGER;
    RETURN;
  END IF;

  -- Count requests in current window
  SELECT COALESCE(SUM(re.request_count), 0)::INTEGER INTO _current_count
  FROM public.rate_limit_entries re
  WHERE re.key = _key
    AND re.endpoint = _endpoint
    AND re.window_start >= _window_start
    AND re.blocked_until IS NULL;

  -- If over limit, block
  IF _current_count >= _max_requests THEN
    INSERT INTO public.rate_limit_entries (key, endpoint, window_start, request_count, blocked_until)
    VALUES (_key, _endpoint, _now, 0, _now + (_block_seconds || ' seconds')::INTERVAL);

    RETURN QUERY SELECT
      false::BOOLEAN,
      0::INTEGER,
      _block_seconds::INTEGER;
    RETURN;
  END IF;

  -- Record this request
  INSERT INTO public.rate_limit_entries (key, endpoint, window_start, request_count)
  VALUES (_key, _endpoint, _now, 1);

  RETURN QUERY SELECT
    true::BOOLEAN,
    (_max_requests - _current_count - 1)::INTEGER,
    0::INTEGER;
END;
$$;

-- 3. Função de limpeza de entradas antigas (> 24h)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_entries
  WHERE window_start < now() - INTERVAL '24 hours';
$$;
