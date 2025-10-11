import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  sitter_name: string;
  sitter_hourly_rate: number;
  num_children: number;
  total_cost: number;
  status: string;
  payment_status: string;
  special_notes?: string;
  preferred_language?: string;
  sitter_id?: string;
  created_at: string;
  request_expires_at?: string;
  response_count?: number;
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
    try {
      setLoading(true);

      if (userRole === 'parent') {
        // Fetch parent bookings with response counts
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const bookingsWithCounts = await Promise.all(
          (data || []).map(async (booking) => {
            const { count } = await supabase
              .from('booking_responses')
              .select('*', { count: 'exact', head: true })
              .eq('booking_id', booking.id)
              .eq('response', 'accepted');

            return {
              ...booking,
              response_count: count || 0,
            };
          })
        );

        setBookings(bookingsWithCounts);
      } else if (userRole === 'sitter') {
        // Fetch sitter's bookings
        const { data: sitterData } = await supabase
          .from('sitters')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .single();

        if (!sitterData) return;

        const sitterName = `${sitterData.first_name} ${sitterData.last_name}`;
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('sitter_name', sitterName)
          .order('booking_date', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
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
          console.log('Booking update:', payload);
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
          console.log('New booking response:', payload);
          
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
                description: 'A sitter has applied for one of your booking requests.',
              });
              fetchBookings();
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
