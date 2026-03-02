
DROP FUNCTION IF EXISTS public.get_parent_booking_stats();

CREATE OR REPLACE FUNCTION public.get_parent_booking_stats()
RETURNS TABLE (
  total_bookings int,
  upcoming_bookings int,
  completed_bookings int,
  total_spent double precision,
  spent_this_month double precision,
  spent_last_month double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (
      WHERE booking_date >= now()
        AND status IN ('pending', 'confirmed')
    )::int,
    COUNT(*) FILTER (
      WHERE status = 'completed'
    )::int,
    COALESCE(SUM(total_cost) FILTER (
      WHERE status = 'completed' OR payment_status = 'completed'
    ), 0)::double precision,
    COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= date_trunc('month', now())
    ), 0)::double precision,
    COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= date_trunc('month', now()) - interval '1 month'
        AND booking_date < date_trunc('month', now())
    ), 0)::double precision
  FROM public.bookings
  WHERE user_id = auth.uid();
$$;
