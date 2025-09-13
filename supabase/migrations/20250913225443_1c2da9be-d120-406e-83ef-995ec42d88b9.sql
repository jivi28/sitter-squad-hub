-- Normalize bookings policies to be permissive and include sitter access
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Sitters can view bookings assigned to them" ON public.bookings;
DROP POLICY IF EXISTS "Sitters can update status of their bookings" ON public.bookings;

-- SELECT policies
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Sitters can view bookings assigned to them"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND CONCAT(s.first_name, ' ', s.last_name) = public.bookings.sitter_name
  )
);

-- UPDATE policies
CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sitters can update status of their bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND CONCAT(s.first_name, ' ', s.last_name) = public.bookings.sitter_name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND CONCAT(s.first_name, ' ', s.last_name) = public.bookings.sitter_name
  )
);

-- Allow sitters to read parent profiles for their assigned bookings
DROP POLICY IF EXISTS "Sitters can view parent profiles for their bookings" ON public.profiles;
CREATE POLICY "Sitters can view parent profiles for their bookings"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.sitters s ON s.user_id = auth.uid()
    WHERE b.user_id = public.profiles.user_id
      AND CONCAT(s.first_name, ' ', s.last_name) = b.sitter_name
  )
);
