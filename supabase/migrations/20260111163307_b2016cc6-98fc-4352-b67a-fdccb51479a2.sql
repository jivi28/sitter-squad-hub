-- Fix the trigger to only validate on UPDATE, not on initial INSERT from handle_new_user
CREATE OR REPLACE FUNCTION public.check_children_or_pets_requirement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate on UPDATE, not on initial INSERT (which is done by handle_new_user trigger)
  -- The initial profile is created empty and filled in during onboarding
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- On UPDATE, only validate if user is actually setting children/pets info
  -- Skip validation if essential fields are still NULL (profile not yet completed)
  IF NEW.phone IS NULL AND NEW.address IS NULL THEN
    RETURN NEW;
  END IF;
  
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