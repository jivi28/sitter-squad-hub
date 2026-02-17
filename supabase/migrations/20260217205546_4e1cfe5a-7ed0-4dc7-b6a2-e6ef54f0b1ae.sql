
-- Create a secure view that exposes only safe sitter fields
CREATE OR REPLACE VIEW public.sitters_public_view AS
SELECT
  id,
  first_name,
  last_name,
  hourly_rate,
  experience,
  languages,
  availability,
  child_age_groups,
  special_skills,
  school,
  pet_experience,
  transportation,
  status,
  approved_at,
  user_id
FROM public.sitters
WHERE status = 'approved' OR approved_at IS NOT NULL;

-- Drop the overly permissive policy that exposes all columns
DROP POLICY IF EXISTS "Anyone can view approved sitters limited info" ON public.sitters;
