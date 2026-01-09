import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingResponse {
  booking_id: string;
  response: 'accepted' | 'declined';
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header to identify the sitter
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestBody = await req.json();
    const { booking_id, response, message }: BookingResponse = requestBody;

    // Phase 3: Input validation
    if (!booking_id || typeof booking_id !== 'string' || booking_id.trim().length === 0) {
      throw new Error('Invalid booking_id');
    }
    if (!response || !['accepted', 'declined'].includes(response)) {
      throw new Error('Invalid response - must be "accepted" or "declined"');
    }
    if (message && (typeof message !== 'string' || message.length > 1000)) {
      throw new Error('Invalid message - must be a string with max 1000 characters');
    }

    console.log('Processing booking response:', { booking_id, response, user_id: user.id });

    // Get sitter information
    const { data: sitter, error: sitterError } = await supabaseClient
      .from('sitters')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (sitterError || !sitter) {
      throw new Error('Sitter profile not found');
    }

    // Get booking information
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Check if booking is still available for responses
    if (booking.status !== 'pending' && booking.status !== 'received_responses') {
      throw new Error('Booking is no longer available for responses');
    }

    if (booking.request_expires_at && new Date(booking.request_expires_at) < new Date()) {
      throw new Error('Booking request has expired');
    }

    // Phase 2.2: Check for booking conflicts
    const { data: existingBookings } = await supabaseClient
      .from('bookings')
      .select('start_time, end_time')
      .eq('sitter_id', sitter.id)
      .eq('booking_date', booking.booking_date)
      .eq('status', 'confirmed');

    const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return start1 < end2 && end1 > start2;
    };

    const hasConflict = existingBookings?.some(existing => 
      timesOverlap(booking.start_time, booking.end_time, existing.start_time, existing.end_time)
    );

    if (hasConflict) {
      throw new Error('You already have a confirmed booking that overlaps with this time slot');
    }

    // Check if this sitter has already responded to this booking
    const { data: existingResponse } = await supabaseClient
      .from('booking_responses')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('sitter_id', sitter.id)
      .maybeSingle();

    if (existingResponse) {
      throw new Error('You have already responded to this booking');
    }

    // Check if this is the first response for this booking
    const { data: existingResponses } = await supabaseClient
      .from('booking_responses')
      .select('id')
      .eq('booking_id', booking_id);

    const isFirstResponse = !existingResponses || existingResponses.length === 0;

    // Record the response
    const { error: responseError } = await supabaseClient
      .from('booking_responses')
      .insert({
        booking_id,
        sitter_id: sitter.id,
        response,
        message: message || null,
      });

    if (responseError) {
      console.error('Error recording response:', responseError);
      throw responseError;
    }

    // Update booking status to show it has responses (always update when accepting if still pending)
    if (response === 'accepted' && booking.status === 'pending') {
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({ status: 'received_responses' })
        .eq('id', booking_id);
      
      if (updateError) {
        console.error('Error updating booking status:', updateError);
      } else {
        console.log(`Booking ${booking_id} status updated to received_responses`);
      }
    }

    if (response === 'accepted') {
      console.log(`Sitter ${sitter.first_name} ${sitter.last_name} applied for booking ${booking_id}`);

      // Send notification email to parent
      try {
        console.log('Sending parent notification email');
        
        const { data: notificationData, error: notificationError } = await supabaseClient.functions.invoke('send-parent-notification', {
          body: {
            bookingId: booking_id,
            sitterName: `${sitter.first_name} ${sitter.last_name}`,
            sitterPhone: sitter.phone,
            sitterExperience: sitter.experience,
            sitterHourlyRate: sitter.hourly_rate,
            parentUserId: booking.user_id,
            bookingDate: booking.booking_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            numChildren: booking.num_children,
            responseMessage: message
          }
        });

        if (notificationError) {
          console.error('Error sending parent notification:', notificationError);
          // Don't throw error - response was recorded successfully
        } else {
          console.log('Parent notification sent successfully:', notificationData);
        }
      } catch (notificationError) {
        console.error('Error calling send-parent-notification function:', notificationError);
        // Don't throw error - response was recorded successfully
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `You've applied for this booking! The parent will review all applications and choose their preferred sitter.`,
          booking_status: 'received_responses'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } else {
      // Response is 'declined'
      console.log(`Booking ${booking_id} declined by sitter ${sitter.first_name} ${sitter.last_name}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Response recorded. The booking remains available for other sitters.',
          booking_status: 'pending'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in respond-to-booking function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});