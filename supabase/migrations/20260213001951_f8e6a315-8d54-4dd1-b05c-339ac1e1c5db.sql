-- Drop the old conflicting payment_status CHECK constraint
-- It allows values (processing, failed, refunded) that conflict with the newer constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;