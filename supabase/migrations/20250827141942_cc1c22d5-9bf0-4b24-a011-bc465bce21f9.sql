-- Fix security issues with functions by setting proper search path

-- Drop and recreate update_updated_at_column function with proper security
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop and recreate handle_new_user function with proper security
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  );
  RETURN NEW;
END;
$$;