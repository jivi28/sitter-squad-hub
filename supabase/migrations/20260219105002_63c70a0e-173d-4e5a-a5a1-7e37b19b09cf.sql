
-- ============================================================
-- 1. Partial unique index: each user can have AT MOST ONE of
--    parent | sitter role (admin can coexist independently).
--    This replaces the UNIQUE(user_id, role) check for the
--    exclusive-role guarantee and makes it DB-native.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_parent_sitter_per_user
  ON public.user_roles (user_id)
  WHERE role IN ('parent', 'sitter');

-- ============================================================
-- 2. assign_role_once(intended_role)  — SECURITY DEFINER
--    Called from the client ONLY when a session exists (OAuth
--    callback). Uses auth.uid() so the caller can only assign
--    a role to themselves. Returns jsonb with success or an
--    error code so the caller can react without exceptions.
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_role_once(_intended_role public.app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid;
  v_existing_role public.app_role;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated', 'code', 'UNAUTHENTICATED');
  END IF;

  IF _intended_role NOT IN ('parent', 'sitter') THEN
    RETURN jsonb_build_object('error', 'Invalid role. Must be parent or sitter.', 'code', 'INVALID_ROLE');
  END IF;

  -- Check for any existing parent/sitter role row
  SELECT role INTO v_existing_role
  FROM public.user_roles
  WHERE user_id = v_user_id
    AND role IN ('parent', 'sitter')
  LIMIT 1;

  IF v_existing_role IS NOT NULL THEN
    IF v_existing_role = _intended_role THEN
      -- Idempotent: role already correct
      RETURN jsonb_build_object('success', true, 'role', v_existing_role::text);
    ELSE
      RETURN jsonb_build_object(
        'error', 'This email is already registered as a ' || v_existing_role || '. You cannot use the same email for both roles.',
        'code', 'CONFLICTING_ROLE'
      );
    END IF;
  END IF;

  -- Insert the role; unique index prevents double-insert race conditions
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, _intended_role);

  RETURN jsonb_build_object('success', true, 'role', _intended_role::text);

EXCEPTION
  WHEN unique_violation THEN
    -- Another concurrent insert won the race; re-read and check
    SELECT role INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = v_user_id AND role IN ('parent', 'sitter')
    LIMIT 1;

    IF v_existing_role = _intended_role THEN
      RETURN jsonb_build_object('success', true, 'role', _intended_role::text);
    ELSE
      RETURN jsonb_build_object(
        'error', 'Role conflict detected.',
        'code', 'CONFLICTING_ROLE'
      );
    END IF;
END;
$$;

-- ============================================================
-- 3. Update handle_new_user to also assign role from metadata.
--    For email/password signups, the client passes
--    options.data.intended_role which lands in raw_user_meta_data.
--    The trigger reads it and inserts into user_roles atomically
--    — no client secret, no edge function needed for this path.
--    For OAuth signups the metadata won't contain intended_role,
--    so the INSERT is skipped; AuthCallback uses assign_role_once.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name    text;
  v_last_name     text;
  v_intended_role text;
BEGIN
  -- Extract name from Google metadata if available
  v_first_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'given_name',
    split_part(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), ' ', 1),
    ''
  )), '');

  v_last_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'family_name',
    CASE
      WHEN array_length(string_to_array(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), ' '), 1) > 1
      THEN split_part(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'), ' ', 2)
      ELSE NULL
    END,
    ''
  )), '');

  -- Create profile row
  INSERT INTO public.profiles (
    user_id, first_name, last_name, phone, address,
    num_children, children_ages, emergency_contact, special_needs
  ) VALUES (
    NEW.id, v_first_name, v_last_name,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'address', '')), ''),
    NULL, NULL,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'emergency_contact', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'special_needs', '')), '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- For email/password signups: atomically assign role from intended_role metadata.
  -- Only 'parent' or 'sitter' are accepted — 'admin' cannot be self-assigned via signup.
  -- OAuth signups omit intended_role here; role is assigned by assign_role_once() in AuthCallback.
  v_intended_role := NEW.raw_user_meta_data ->> 'intended_role';
  IF v_intended_role IN ('parent', 'sitter') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_intended_role::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
