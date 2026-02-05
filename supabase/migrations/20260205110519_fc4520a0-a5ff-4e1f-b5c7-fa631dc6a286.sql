-- Create a function to check if a user already has a conflicting role
CREATE OR REPLACE FUNCTION public.check_exclusive_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_role public.app_role;
BEGIN
  -- Check if user already has a different role (parent vs sitter)
  -- Admin can coexist with either
  IF NEW.role IN ('parent', 'sitter') THEN
    SELECT role INTO existing_role
    FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role IN ('parent', 'sitter')
      AND role != NEW.role
    LIMIT 1;
    
    IF existing_role IS NOT NULL THEN
      RAISE EXCEPTION 'This account is already registered as a %. You cannot use the same email for both parent and sitter accounts.', existing_role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce exclusive roles on insert
DROP TRIGGER IF EXISTS enforce_exclusive_role ON public.user_roles;
CREATE TRIGGER enforce_exclusive_role
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_exclusive_role();

-- Create a helper function to check if a user has a conflicting role (for frontend use)
CREATE OR REPLACE FUNCTION public.has_conflicting_role(_user_id uuid, _intended_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('parent', 'sitter')
      AND role != _intended_role
      AND _intended_role IN ('parent', 'sitter')
  )
$$;