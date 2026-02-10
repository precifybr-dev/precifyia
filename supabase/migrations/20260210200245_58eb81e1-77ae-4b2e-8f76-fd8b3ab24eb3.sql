
ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_ticket_consent()
RETURNS trigger AS $$
BEGIN
  IF NEW.ticket_id IS NOT NULL THEN
    UPDATE public.support_tickets 
    SET consent_granted = (NEW.is_active AND NEW.revoked_at IS NULL AND NEW.expires_at > now())
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trg_sync_ticket_consent
AFTER INSERT OR UPDATE ON public.support_consent
FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_consent();
