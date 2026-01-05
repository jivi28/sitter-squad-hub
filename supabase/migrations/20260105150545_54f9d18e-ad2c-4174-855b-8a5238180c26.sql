-- Create helper function for checking children or pets requirement
CREATE OR REPLACE FUNCTION public.check_children_or_pets_requirement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Check if at least one of children or pets is provided
  IF (NEW.num_children IS NULL OR NEW.num_children = 0) AND (NEW.num_pets IS NULL OR NEW.num_pets = 0) THEN
    RAISE EXCEPTION 'You must have at least 1 child or 1 pet to create a profile';
  END IF;
  
  -- If children exist, ensure children_ages is provided
  IF NEW.num_children IS NOT NULL AND NEW.num_children > 0 THEN
    IF NEW.children_ages IS NULL OR TRIM(NEW.children_ages) = '' THEN
      RAISE EXCEPTION 'Please provide children ages when you have children';
    END IF;
  END IF;
  
  -- If pets exist, ensure pet_details is provided
  IF NEW.num_pets IS NOT NULL AND NEW.num_pets > 0 THEN
    IF NEW.pet_details IS NULL OR TRIM(NEW.pet_details) = '' THEN
      RAISE EXCEPTION 'Please provide pet details when you have pets';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for profile validation
DROP TRIGGER IF EXISTS validate_children_or_pets ON public.profiles;
CREATE TRIGGER validate_children_or_pets
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_children_or_pets_requirement();