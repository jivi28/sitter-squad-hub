import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  sitter_id: string | null;
  sitter_hourly_rate: number;
  num_children: number;
  total_cost: number;
  status: string;
  payment_status: string;
  special_notes?: string;
  preferred_language?: string;
  created_at: string;
  request_expires_at?: string;
  response_count?: number;
  extension_count?: number;
  sitters?: {
    first_name: string;
    last_name: string;
  };
}

interface UseBookingUpdatesProps {
  userId: string;
  userRole: 'parent' | 'sitter';
}

export const useBookingUpdates = ({ userId, userRole }: UseBookingUpdatesProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBookings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      if (userRole === 'parent') {
        // Fetch parent bookings (no embedded sitters because bookings.sitter_id has no FK)
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const bookingIds = (data || []).map((b) => b.id);

        // Fetch all response counts in ONE query (fixes N+1)
        let countMap: Record<string, number> = {};
        if (bookingIds.length > 0) {
          const { data: responseCounts, error: countError } = await supabase
            .from('booking_responses')
            .select('booking_id')
            .eq('response', 'accepted')
            .in('booking_id', bookingIds);

          if (!countError && responseCounts) {
            countMap = responseCounts.reduce((acc, r) => {
              acc[r.booking_id] = (acc[r.booking_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }
        }

        // Fetch sitter names for bookings that already have sitter_id (confirmed bookings)
        const sitterIds = Array.from(
          new Set((data || []).map((b) => b.sitter_id).filter(Boolean))
        ) as string[];

        const sitterMap: Record<string, { first_name: string; last_name: string }> = {};
        if (sitterIds.length > 0) {
          const { data: sittersData, error: sittersError } = await supabase
            .from('sitters_public_view' as any)
            .select('id, first_name, last_name')
            .in('id', sitterIds);

          // If RLS blocks this, we still want bookings to render.
          if (!sittersError && sittersData) {
            for (const s of sittersData as any[]) {
              sitterMap[s.id] = { first_name: s.first_name, last_name: s.last_name };
            }
          }
        }

        const bookingsWithCounts = (data || []).map((booking: any) => ({
          ...booking,
          sitters: booking.sitter_id ? sitterMap[booking.sitter_id] : undefined,
          response_count: countMap[booking.id] || 0,
        }));

        setBookings(bookingsWithCounts as any);
      } else if (userRole === 'sitter') {
        // Fetch sitter's bookings using sitter_id
        const { data: sitterData } = await supabase
          .from('sitters')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!sitterData) return;

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('sitter_id', sitterData.id)
          .order('booking_date', { ascending: true });

        if (error) throw error;

        setBookings((data || []) as any);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    // Set up real-time subscription for bookings table
    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          
          fetchBookings(); // Refresh on any booking change
        }
      )
      .subscribe();

    // Set up real-time subscription for booking responses
    const responsesChannel = supabase
      .channel('responses-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_responses',
        },
        async (payload) => {
          console.log('New booking response received:', payload);
          
          if (userRole === 'parent') {
            // Check if this response is for the parent's booking
            const { data: booking } = await supabase
              .from('bookings')
              .select('user_id')
              .eq('id', payload.new.booking_id)
              .single();

            if (booking?.user_id === userId) {
              toast({
                title: 'New Sitter Application!',
                description: 'A sitter has applied for one of your booking requests. Check your bookings!',
              });
              // Force immediate refresh to show new applications
              await fetchBookings();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [userId, userRole]);

  return { bookings, loading, refetch: fetchBookings };
};
