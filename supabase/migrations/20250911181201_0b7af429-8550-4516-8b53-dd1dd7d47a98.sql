-- Allow parents to view approved sitters (fix RLS blocking sitter listings)
-- Create a SELECT policy so authenticated users can read approved sitter profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sitters' AND policyname = 'Public can view approved sitters'
  ) THEN
    CREATE POLICY "Public can view approved sitters"
    ON public.sitters
    FOR SELECT
    USING ((auth.role() = 'authenticated') AND (status = 'approved' OR approved_at IS NOT NULL));
  END IF;
END $$;