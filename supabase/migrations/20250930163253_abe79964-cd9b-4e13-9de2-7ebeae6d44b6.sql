-- Add service_type to bookings table
ALTER TABLE public.bookings 
ADD COLUMN service_type text NOT NULL DEFAULT 'babysitting' CHECK (service_type IN ('babysitting', 'pet_sitting'));

-- Add pet experience to sitters table
ALTER TABLE public.sitters 
ADD COLUMN pet_experience text;

-- Add pets info to profiles table
ALTER TABLE public.profiles 
ADD COLUMN num_pets integer DEFAULT 0,
ADD COLUMN pet_details text;