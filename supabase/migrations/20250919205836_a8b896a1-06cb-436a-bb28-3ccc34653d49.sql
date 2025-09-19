-- Add foreign key relationship between booking_responses and sitters
ALTER TABLE public.booking_responses 
ADD CONSTRAINT booking_responses_sitter_id_fkey 
FOREIGN KEY (sitter_id) REFERENCES public.sitters(id) ON DELETE CASCADE;