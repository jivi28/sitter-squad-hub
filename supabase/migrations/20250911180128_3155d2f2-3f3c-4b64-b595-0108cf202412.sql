-- Link sitters.user_id to auth.users so Supabase UI can resolve emails on click
-- and enforce 1 sitter profile per user.

-- 1) Add unique constraint to prevent duplicates (safe, no duplicates exist)
ALTER TABLE public.sitters
ADD CONSTRAINT sitters_user_id_key UNIQUE (user_id);

-- 2) Add FK to auth.users so the Supabase table UI can show user details when clicking user_id
ALTER TABLE public.sitters
ADD CONSTRAINT sitters_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;