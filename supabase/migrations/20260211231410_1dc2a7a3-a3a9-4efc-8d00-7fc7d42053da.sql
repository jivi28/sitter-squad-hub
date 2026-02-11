
-- 1. Constrain booking status values
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_status
  CHECK (status IN ('pending', 'received_responses', 'confirmed', 'completed', 'cancelled', 'expired'));

-- 2. Constrain payment_status values
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bookings_payment_status
  CHECK (payment_status IN ('pending', 'completed', 'paid'));

-- 3. Prevent impossible state combinations via trigger
CREATE OR REPLACE FUNCTION public.validate_booking_state()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  -- Expired bookings cannot have pending payment
  IF NEW.status = 'expired' AND NEW.payment_status = 'pending' THEN
    -- Allow only if transitioning TO expired (auto-expiry sets this)
    -- But block if someone tries to set payment_status=pending on an expired booking
    IF TG_OP = 'UPDATE' AND OLD.status = 'expired' THEN
      RAISE EXCEPTION 'Cannot modify payment status on an expired booking';
    END IF;
  END IF;

  -- Cancelled bookings cannot have completed/paid payment
  IF NEW.status = 'cancelled' AND NEW.payment_status IN ('completed', 'paid') THEN
    RAISE EXCEPTION 'Cancelled bookings cannot have completed payment';
  END IF;

  -- Pending bookings should not have completed payment
  IF NEW.status = 'pending' AND NEW.payment_status IN ('completed', 'paid') THEN
    RAISE EXCEPTION 'Pending bookings cannot have completed payment';
  END IF;

  -- Only confirmed/completed bookings can have a sitter assigned
  IF NEW.sitter_id IS NOT NULL AND NEW.status IN ('pending', 'received_responses', 'expired') THEN
    -- Allow received_responses → confirmed transition (select-sitter sets both)
    IF TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'received_responses') AND NEW.status = 'confirmed' THEN
      -- This is the normal sitter selection flow, allow it
      NULL;
    ELSE
      RAISE EXCEPTION 'Sitter can only be assigned to confirmed or completed bookings';
    END IF;
  END IF;

  -- Completed bookings must have payment completed/paid
  IF NEW.status = 'completed' AND NEW.payment_status NOT IN ('completed', 'paid') THEN
    RAISE EXCEPTION 'Completed bookings must have payment finalized';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_booking_state
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_state();

-- 4. Constrain sitter status values
ALTER TABLE public.sitters
  ADD CONSTRAINT chk_sitters_status
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- 5. Restrict what parents can update on their own bookings
-- Drop the overly permissive parent UPDATE policy and replace with a restricted one
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

CREATE POLICY "Parents can cancel their own pending bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Parents can only set status to 'cancelled'
      status = 'cancelled'
      -- Or keep the same status (for non-status updates like extension)
      OR status = (SELECT b.status FROM public.bookings b WHERE b.id = bookings.id)
    )
  );
