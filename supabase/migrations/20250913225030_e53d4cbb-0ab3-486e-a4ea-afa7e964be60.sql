-- Add RLS policy to allow sitters to view bookings where they are the sitter
CREATE POLICY "Sitters can view bookings assigned to them" 
ON public.bookings 
FOR SELECT 
USING (
  sitter_name IN (
    SELECT CONCAT(first_name, ' ', last_name) 
    FROM public.sitters 
    WHERE user_id = auth.uid()
  )
);

-- Add RLS policy to allow sitters to update status of their bookings
CREATE POLICY "Sitters can update status of their bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  sitter_name IN (
    SELECT CONCAT(first_name, ' ', last_name) 
    FROM public.sitters 
    WHERE user_id = auth.uid()
  )
) 
WITH CHECK (
  sitter_name IN (
    SELECT CONCAT(first_name, ' ', last_name) 
    FROM public.sitters 
    WHERE user_id = auth.uid()
  )
);