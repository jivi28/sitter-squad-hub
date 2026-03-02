
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
    COUNT(*)::int AS total_bookings,
    COUNT(*) FILTER (
      WHERE booking_date >= CURRENT_DATE
        AND status IN ('pending', 'confirmed')
    )::int AS upcoming_bookings,
    COUNT(*) FILTER (
      WHERE status = 'completed'
    )::int AS completed_bookings,
    COALESCE(SUM(total_cost) FILTER (
      WHERE status = 'completed' OR payment_status = 'completed'
    ), 0)::double precision AS total_spent,
    COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= date_trunc('month', now())::date
    ), 0)::double precision AS spent_this_month,
    COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= (date_trunc('month', now()) - interval '1 month')::date
        AND booking_date < date_trunc('month', now())::date
    ), 0)::double precision AS spent_last_month
  FROM public.bookings
  WHERE user_id = auth.uid();
$$;
