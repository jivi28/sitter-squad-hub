-- Update sitters with availability to approved status so they appear in booking system
UPDATE sitters 
SET status = 'approved', approved_at = now() 
WHERE availability IS NOT NULL 
AND jsonb_array_length(availability) > 0;