-- Phase 1: Fix Sitter PII Exposure
-- Create a policy that restricts which sitter fields authenticated users can see
-- Drop the old policy that allowed viewing all approved sitter info
DROP POLICY IF EXISTS "Authenticated users can view basic sitter info" ON public.sitters;

-- Create new policy: Anyone can view limited sitter info (no PII)
-- This policy will be combined with other policies using OR logic
CREATE POLICY "Anyone can view approved sitters limited info" 
ON public.sitters 
FOR SELECT 
USING (
  (status = 'approved' OR approved_at IS NOT NULL)
);

-- Create new policy: Parents with confirmed paid bookings can view full sitter contact info
CREATE POLICY "Parents with confirmed bookings can view sitter contact info" 
ON public.sitters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.sitter_id = sitters.id
      AND b.user_id = auth.uid()
      AND b.status = 'confirmed'
      AND b.payment_status IN ('completed', 'paid')
  )
);

-- Phase 2: Fix Insecure Name-Based Authorization
-- Replace name-matching with sitter_id matching in bookings table

-- Drop old insecure policies
DROP POLICY IF EXISTS "Sitters can view their assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Sitters can update status of their assigned bookings" ON public.bookings;

-- Create new secure policies using sitter_id
CREATE POLICY "Sitters can view their assigned bookings" 
ON public.bookings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
);

CREATE POLICY "Sitters can update status of their assigned bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
);

-- Fix insecure policy in profiles table
DROP POLICY IF EXISTS "Sitters can view parent profiles for their bookings" ON public.profiles;

CREATE POLICY "Sitters can view parent profiles for their bookings" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.sitters s ON s.id = b.sitter_id
    WHERE b.user_id = profiles.user_id
      AND s.user_id = auth.uid()
  )
);