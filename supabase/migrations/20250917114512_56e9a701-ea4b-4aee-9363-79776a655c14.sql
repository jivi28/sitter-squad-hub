-- Add new columns to bookings table for request-based system
ALTER TABLE public.bookings 
ADD COLUMN request_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN sitter_id UUID,
ADD COLUMN request_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Make sitter_name and sitter_hourly_rate nullable since they're filled on acceptance
ALTER TABLE public.bookings 
ALTER COLUMN sitter_name DROP NOT NULL,
ALTER COLUMN sitter_hourly_rate DROP NOT NULL;

-- Add payment_status column
ALTER TABLE public.bookings 
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

-- Create booking_responses table to track sitter responses
CREATE TABLE public.booking_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sitter_id UUID NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking_responses
ALTER TABLE public.booking_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_responses
CREATE POLICY "Sitters can create responses to requests sent to them" 
ON public.booking_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sitters s 
    WHERE s.user_id = auth.uid() AND s.id = sitter_id
  )
);

CREATE POLICY "Sitters can view their own responses" 
ON public.booking_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sitters s 
    WHERE s.user_id = auth.uid() AND s.id = sitter_id
  )
);

CREATE POLICY "Parents can view responses to their bookings" 
ON public.booking_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id AND b.user_id = auth.uid()
  )
);

-- Add favorite_sitters table for rebooking feature
CREATE TABLE public.favorite_sitters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sitter_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sitter_id)
);

-- Enable RLS on favorite_sitters
ALTER TABLE public.favorite_sitters ENABLE ROW LEVEL SECURITY;

-- Create policies for favorite_sitters
CREATE POLICY "Users can manage their own favorite sitters" 
ON public.favorite_sitters 
FOR ALL 
USING (auth.uid() = user_id);