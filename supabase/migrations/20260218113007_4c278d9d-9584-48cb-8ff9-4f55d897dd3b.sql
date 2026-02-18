
-- DEV HELPER: dev_reset_user(email)
-- Deletes all data for a given email across auth.users, profiles, user_roles, sitters.
-- SECURITY: This function should ONLY be callable by service_role (admin). 
-- It is a SECURITY DEFINER function owned by postgres (service role).
-- It will silently succeed even if the user does not exist.

CREATE OR REPLACE FUNCTION public.dev_reset_user(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_deleted_from text[] := '{}';
BEGIN
  -- Find the auth user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No user found with that email',
      'deleted_from', '[]'::jsonb
    );
  END IF;

  -- Delete sitters rows
  DELETE FROM public.sitters WHERE user_id = v_user_id;
  IF FOUND THEN v_deleted_from := array_append(v_deleted_from, 'sitters'); END IF;

  -- Delete user_roles rows
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  IF FOUND THEN v_deleted_from := array_append(v_deleted_from, 'user_roles'); END IF;

  -- Delete booking_responses via sitter
  DELETE FROM public.booking_responses WHERE sitter_id IN (
    SELECT id FROM public.sitters WHERE user_id = v_user_id
  );

  -- Delete bookings (as parent)
  DELETE FROM public.bookings WHERE user_id = v_user_id;
  IF FOUND THEN v_deleted_from := array_append(v_deleted_from, 'bookings'); END IF;

  -- Delete profiles
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  IF FOUND THEN v_deleted_from := array_append(v_deleted_from, 'profiles'); END IF;

  -- Delete auth user (cascades to auth.identities, auth.sessions, etc.)
  DELETE FROM auth.users WHERE id = v_user_id;
  IF FOUND THEN v_deleted_from := array_append(v_deleted_from, 'auth.users'); END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', _email,
    'deleted_from', to_jsonb(v_deleted_from)
  );
END;
$$;

-- IMPORTANT: Revoke from public and anon — only service_role can call this
REVOKE ALL ON FUNCTION public.dev_reset_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dev_reset_user(text) FROM anon;
REVOKE ALL ON FUNCTION public.dev_reset_user(text) FROM authenticated;
-- Only service_role retains EXECUTE (granted implicitly as owner)

COMMENT ON FUNCTION public.dev_reset_user IS 
  'DEV ONLY: Atomically removes all data for a given email. Only callable by service_role.';
