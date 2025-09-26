-- Allow public read access to schools table for signup form
DROP POLICY IF EXISTS "Authenticated users can view schools" ON public.schools;

CREATE POLICY "Anyone can view schools" 
ON public.schools 
FOR SELECT 
USING (true);