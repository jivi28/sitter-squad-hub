-- Index for the redirect query: bookings by user_id filtered on status/payment_status
CREATE INDEX IF NOT EXISTS idx_bookings_user_status
  ON public.bookings (user_id, status, payment_status);

-- Index for role detection: user_roles by user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);