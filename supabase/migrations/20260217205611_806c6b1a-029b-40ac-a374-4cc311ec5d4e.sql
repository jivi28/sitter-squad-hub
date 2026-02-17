
-- Re-add the policy for approved sitters so the view works with SECURITY INVOKER
-- The column restriction is enforced by the view itself, not by RLS
CREATE POLICY "Authenticated users can view approved sitters via view"
ON public.sitters
FOR SELECT
USING (
  (status = 'approved' OR approved_at IS NOT NULL)
  AND auth.role() = 'authenticated'
);
