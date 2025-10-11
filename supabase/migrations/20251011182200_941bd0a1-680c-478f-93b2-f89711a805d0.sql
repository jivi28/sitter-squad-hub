-- ============================================
-- PHASE 1: URGENT SECURITY FIXES
-- ============================================

-- 1.1: Protect Teenage Sitter Personal Information (HIGHEST PRIORITY)
-- Drop existing overly permissive RLS policy
DROP POLICY IF EXISTS "Public can view approved sitters" ON public.sitters;

-- Create restricted public view policy (excludes sensitive fields for unauthenticated viewing)
-- Sitters table will be queried through edge functions that handle sensitive data filtering
CREATE POLICY "Authenticated users can view basic sitter info"
ON public.sitters
FOR SELECT
TO authenticated
USING (
  (status = 'approved' OR approved_at IS NOT NULL)
);

-- 1.2: Implement Role-Based Access Control System
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('parent', 'sitter', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger to auto-assign parent role when profile created
CREATE OR REPLACE FUNCTION assign_parent_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION assign_parent_role();

-- Trigger to auto-assign sitter role when sitter profile created
CREATE OR REPLACE FUNCTION assign_sitter_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'sitter')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sitter_created
AFTER INSERT ON public.sitters
FOR EACH ROW
EXECUTE FUNCTION assign_sitter_role();

-- 1.3: Fix Name-Based Booking Access (Replace with Foreign Key)
-- Update RLS policies to use sitter_id foreign key instead of name matching
DROP POLICY IF EXISTS "Sitters can update status of their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Sitters can view bookings assigned to them" ON public.bookings;

CREATE POLICY "Sitters can update status of their assigned bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
);

CREATE POLICY "Sitters can view their assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sitters s
    WHERE s.user_id = auth.uid()
      AND s.id = bookings.sitter_id
  )
);

-- ============================================
-- PHASE 2.3: Schedule Request Expiration Cleanup
-- ============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiration function to run every 15 minutes
SELECT cron.schedule(
  'expire-old-bookings',
  '*/15 * * * *',
  $$SELECT expire_old_booking_requests()$$
);