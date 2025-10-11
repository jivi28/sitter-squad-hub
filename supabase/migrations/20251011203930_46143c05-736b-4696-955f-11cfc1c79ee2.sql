-- Step 6.3: Remove sitter_name column from bookings table
-- This column is now redundant as we use sitter_id to join with sitters table

-- Drop the index first
DROP INDEX IF EXISTS idx_bookings_sitter_name;

-- Drop the sitter_name column
ALTER TABLE public.bookings DROP COLUMN IF EXISTS sitter_name;