-- Add languages column to sitters table
ALTER TABLE public.sitters 
ADD COLUMN languages text[];

-- Add a helpful comment
COMMENT ON COLUMN public.sitters.languages IS 'Array of languages the sitter speaks (e.g., ["English", "Spanish", "French"])';