-- First, set placeholder values for any rows that already have NULL (from partial migration failures)
UPDATE public.profiles
SET 
  first_name = COALESCE(NULLIF(TRIM(first_name), ''), 'TEMP_PLACEHOLDER'),
  last_name = COALESCE(NULLIF(TRIM(last_name), ''), 'TEMP_PLACEHOLDER'),
  phone = COALESCE(NULLIF(TRIM(phone), ''), 'TEMP_PLACEHOLDER'),
  address = COALESCE(NULLIF(TRIM(address), ''), 'TEMP_PLACEHOLDER'),
  children_ages = COALESCE(NULLIF(TRIM(children_ages), ''), 'TEMP_PLACEHOLDER'),
  num_children = COALESCE(num_children, 0);

-- Now drop the NOT NULL constraints
ALTER TABLE public.profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN num_children DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN children_ages DROP NOT NULL;

-- Convert placeholder values back to NULL for incomplete profiles
UPDATE public.profiles
SET 
  first_name = NULLIF(first_name, 'TEMP_PLACEHOLDER'),
  last_name = NULLIF(last_name, 'TEMP_PLACEHOLDER'),
  phone = NULLIF(phone, 'TEMP_PLACEHOLDER'),
  address = NULLIF(address, 'TEMP_PLACEHOLDER'),
  children_ages = NULLIF(children_ages, 'TEMP_PLACEHOLDER'),
  num_children = CASE WHEN first_name = 'TEMP_PLACEHOLDER' THEN NULL ELSE num_children END
WHERE first_name = 'TEMP_PLACEHOLDER' OR last_name = 'TEMP_PLACEHOLDER' OR phone = 'TEMP_PLACEHOLDER' OR address = 'TEMP_PLACEHOLDER' OR children_ages = 'TEMP_PLACEHOLDER';