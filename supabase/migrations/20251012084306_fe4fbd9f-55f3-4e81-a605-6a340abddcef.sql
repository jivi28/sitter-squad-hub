-- Fix the handle_new_user function to prevent duplicate key errors
-- Use ON CONFLICT to handle cases where profile already exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'address', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'num_children')::integer, 0),
    COALESCE(NEW.raw_user_meta_data ->> 'children_ages', ''),
    NEW.raw_user_meta_data ->> 'emergency_contact',
    NEW.raw_user_meta_data ->> 'special_needs'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;