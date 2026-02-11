-- Partial index: active bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_user_active_status
  ON public.bookings (user_id)
  WHERE status IN ('pending', 'confirmed');

-- Partial index: bookings with pending payment
CREATE INDEX IF NOT EXISTS idx_bookings_user_pending_payment
  ON public.bookings (user_id)
  WHERE payment_status = 'pending';

-- Role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);