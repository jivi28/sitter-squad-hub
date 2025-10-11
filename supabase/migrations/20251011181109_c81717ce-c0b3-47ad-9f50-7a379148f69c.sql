-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION expire_old_booking_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION check_pending_booking_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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