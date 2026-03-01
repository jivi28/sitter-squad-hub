
CREATE OR REPLACE FUNCTION public.get_parent_booking_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_bookings', COUNT(*)::int,
    'upcoming_bookings', COUNT(*) FILTER (
      WHERE booking_date >= CURRENT_DATE
        AND status IN ('pending', 'confirmed')
    )::int,
    'completed_bookings', COUNT(*) FILTER (
      WHERE status = 'completed'
    )::int,
    'total_spent', COALESCE(SUM(total_cost) FILTER (
      WHERE status = 'completed' OR payment_status = 'completed'
    ), 0)::numeric,
    'spent_this_month', COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= date_trunc('month', CURRENT_DATE)::date
    ), 0)::numeric,
    'spent_last_month', COALESCE(SUM(total_cost) FILTER (
      WHERE (status = 'completed' OR payment_status = 'completed')
        AND booking_date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
        AND booking_date < date_trunc('month', CURRENT_DATE)::date
    ), 0)::numeric
  )
  FROM public.bookings
  WHERE user_id = auth.uid();
$$;
