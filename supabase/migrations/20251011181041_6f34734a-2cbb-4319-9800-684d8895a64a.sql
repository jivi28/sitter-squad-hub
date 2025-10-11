-- Phase 4: Request Expiration Enforcement
-- Create function to auto-expire old booking requests
CREATE OR REPLACE FUNCTION expire_old_booking_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND request_expires_at IS NOT NULL
    AND request_expires_at < now();
END;
$$;

-- Add extension_count column to track how many times request was extended
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;

-- Phase 5: Rate Limiting & Validation
-- Add constraint for max pending bookings per user
CREATE OR REPLACE FUNCTION check_pending_booking_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pending_count integer;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO pending_count
    FROM public.bookings
    WHERE user_id = NEW.user_id
      AND status = 'pending';
    
    IF pending_count >= 10 THEN
      RAISE EXCEPTION 'Maximum pending booking limit (10) reached. Please wait for responses or cancel some requests.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_booking_limit_trigger
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION check_pending_booking_limit();

-- Create table for sitter unavailability dates
CREATE TABLE IF NOT EXISTS public.sitter_unavailable_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id uuid REFERENCES public.sitters(id) ON DELETE CASCADE NOT NULL,
  unavailable_date date NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(sitter_id, unavailable_date)
);

-- Enable RLS on unavailable dates
ALTER TABLE public.sitter_unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Sitters can manage their own unavailable dates
CREATE POLICY "Sitters can manage their unavailable dates"
ON public.sitter_unavailable_dates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.id = sitter_unavailable_dates.sitter_id
      AND s.user_id = auth.uid()
  )
);

-- Parents can view sitter unavailable dates
CREATE POLICY "Parents can view unavailable dates"
ON public.sitter_unavailable_dates
FOR SELECT
USING (auth.role() = 'authenticated');