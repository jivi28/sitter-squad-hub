-- 1) Ensure profiles.user_id is unique (required for FK targeting)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- 2) Add a foreign key from bookings.user_id -> profiles.user_id so Supabase can infer the relationship for nested selects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_user_id_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(user_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END$$;

-- 3) Helpful indexes for performance on sitter_name and booking_date filters
CREATE INDEX IF NOT EXISTS idx_bookings_sitter_name ON public.bookings (sitter_name);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings (booking_date);
