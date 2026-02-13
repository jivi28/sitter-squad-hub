-- 1. Update CHECK constraint: remove 'paid', keep only 'pending' and 'completed'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS chk_bookings_payment_status;
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_payment_status
  CHECK (payment_status IN ('pending', 'completed'));

-- 2. Update validate_booking_state trigger to remove 'paid' references
CREATE OR REPLACE FUNCTION public.validate_booking_state()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  -- Expired bookings cannot have pending payment modified
  IF NEW.status = 'expired' AND NEW.payment_status = 'pending' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'expired' THEN
      RAISE EXCEPTION 'Cannot modify payment status on an expired booking';
    END IF;
  END IF;

  -- Cancelled bookings cannot have completed payment
  IF NEW.status = 'cancelled' AND NEW.payment_status = 'completed' THEN
    RAISE EXCEPTION 'Cancelled bookings cannot have completed payment';
  END IF;

  -- Pending bookings should not have completed payment
  IF NEW.status = 'pending' AND NEW.payment_status = 'completed' THEN
    RAISE EXCEPTION 'Pending bookings cannot have completed payment';
  END IF;

  -- Only confirmed/completed bookings can have a sitter assigned
  IF NEW.sitter_id IS NOT NULL AND NEW.status IN ('pending', 'received_responses', 'expired') THEN
    IF TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'received_responses') AND NEW.status = 'confirmed' THEN
      NULL; -- Normal sitter selection flow
    ELSE
      RAISE EXCEPTION 'Sitter can only be assigned to confirmed or completed bookings';
    END IF;
  END IF;

  -- Completed bookings must have payment completed
  IF NEW.status = 'completed' AND NEW.payment_status != 'completed' THEN
    RAISE EXCEPTION 'Completed bookings must have payment finalized';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update has_confirmed_booking_with_sitter to only check 'completed'
CREATE OR REPLACE FUNCTION public.has_confirmed_booking_with_sitter(_sitter_id uuid, _parent_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.bookings b
    where b.sitter_id = _sitter_id
      and b.user_id = _parent_user_id
      and b.status = 'confirmed'
      and b.payment_status = 'completed'
  )
$$;