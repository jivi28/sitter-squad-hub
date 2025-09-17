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

    const { booking_id, response, message }: BookingResponse = await req.json();

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

    // Check if booking is still pending and not expired
    if (booking.status !== 'pending') {
      throw new Error('Booking is no longer available');
    }

    if (booking.request_expires_at && new Date(booking.request_expires_at) < new Date()) {
      throw new Error('Booking request has expired');
    }

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

    if (response === 'accepted') {
      // Calculate total cost
      const startTime = new Date(`1970-01-01T${booking.start_time}`);
      const endTime = new Date(`1970-01-01T${booking.end_time}`);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const totalCost = hours * sitter.hourly_rate;

      // Update booking with sitter information
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          sitter_id: sitter.id,
          sitter_name: `${sitter.first_name} ${sitter.last_name}`,
          sitter_hourly_rate: sitter.hourly_rate,
          total_cost: totalCost,
          status: 'confirmed'
        })
        .eq('id', booking_id);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        throw updateError;
      }

      // TODO: Send confirmation email to parent
      // TODO: Create payment intent for the booking
      
      console.log(`Booking ${booking_id} accepted by sitter ${sitter.first_name} ${sitter.last_name}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Booking accepted! Total cost: $${totalCost.toFixed(2)}`,
          booking_status: 'confirmed',
          total_cost: totalCost
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

  } catch (error) {
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