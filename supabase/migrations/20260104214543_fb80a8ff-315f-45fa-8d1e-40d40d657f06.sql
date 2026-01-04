-- Update handle_new_user() to use NULL instead of empty strings for new Google OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract name from Google metadata if available, use NULL if empty
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

  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    phone,
    address,
    num_children,
    children_ages,
    emergency_contact,
    special_needs
  ) VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'address', '')), ''),
    NULL,
    NULL,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'emergency_contact', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'special_needs', '')), '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;