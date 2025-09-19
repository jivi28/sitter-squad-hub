import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectSitterRequest {
  booking_id: string;
  sitter_id: string;
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

    // Get the authorization header to identify the parent
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { booking_id, sitter_id }: SelectSitterRequest = await req.json();

    console.log('Processing sitter selection:', { booking_id, sitter_id, user_id: user.id });

    // Get booking information and verify ownership
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('user_id', user.id) // Ensure parent owns this booking
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found or access denied');
    }

    // Check if booking is in the right state
    if (booking.status !== 'received_responses' && booking.status !== 'pending') {
      throw new Error('This booking is no longer available for selection');
    }

    // Get sitter information
    const { data: sitter, error: sitterError } = await supabaseClient
      .from('sitters')
      .select('*')
      .eq('id', sitter_id)
      .single();

    if (sitterError || !sitter) {
      throw new Error('Sitter not found');
    }

    // Verify the sitter actually applied for this booking
    const { data: application, error: applicationError } = await supabaseClient
      .from('booking_responses')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('sitter_id', sitter_id)
      .eq('response', 'accepted')
      .single();

    if (applicationError || !application) {
      throw new Error('Sitter has not applied for this booking');
    }

    // Calculate total cost
    const startTime = new Date(`1970-01-01T${booking.start_time}`);
    const endTime = new Date(`1970-01-01T${booking.end_time}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const totalCost = hours * sitter.hourly_rate;

    // Update booking with selected sitter
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

    console.log(`Parent selected sitter ${sitter.first_name} ${sitter.last_name} for booking ${booking_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `You've selected ${sitter.first_name} ${sitter.last_name}! Total cost: $${totalCost.toFixed(2)}. You can now proceed with payment.`,
        booking_status: 'confirmed',
        total_cost: totalCost
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in select-sitter function:', error);
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