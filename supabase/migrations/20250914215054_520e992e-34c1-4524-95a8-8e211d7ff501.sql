-- Add preferred_language column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN preferred_language text;

-- Add a helpful comment
COMMENT ON COLUMN public.bookings.preferred_language IS 'Optional preferred language for the babysitter to speak (e.g., English, Spanish, French, etc.)';