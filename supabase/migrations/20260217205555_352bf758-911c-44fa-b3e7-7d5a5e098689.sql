
-- Fix: Change view to SECURITY INVOKER so it respects the querying user's permissions
ALTER VIEW public.sitters_public_view SET (security_invoker = on);
