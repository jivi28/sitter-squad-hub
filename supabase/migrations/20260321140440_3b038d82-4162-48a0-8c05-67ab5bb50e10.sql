-- Backfill: sync status to 'approved' where approved_at is set but status is stale
UPDATE public.sitters
SET status = 'approved', updated_at = now()
WHERE approved_at IS NOT NULL AND status != 'approved';

-- Trigger to auto-sync status when approved_at changes
CREATE OR REPLACE FUNCTION public.sync_sitter_status_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.approved_at IS NOT NULL AND OLD.approved_at IS NULL THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_sitter_status
BEFORE UPDATE ON public.sitters
FOR EACH ROW
EXECUTE FUNCTION public.sync_sitter_status_on_approval();