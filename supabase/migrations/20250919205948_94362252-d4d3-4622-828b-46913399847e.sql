-- Enable realtime for booking_responses table
ALTER TABLE public.booking_responses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_responses;