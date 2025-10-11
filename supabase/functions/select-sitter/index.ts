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

    const requestBody = await req.json();
    const { booking_id, sitter_id }: SelectSitterRequest = requestBody;

    // Phase 3: Input validation
    if (!booking_id || typeof booking_id !== 'string' || booking_id.trim().length === 0) {
      throw new Error('Invalid booking_id');
    }
    if (!sitter_id || typeof sitter_id !== 'string' || sitter_id.trim().length === 0) {
      throw new Error('Invalid sitter_id');
    }

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

    // Phase 4: Update booking with selected sitter (removed sitter_name field)
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        sitter_id: sitter.id,
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

    // Get parent's profile for address and contact info
    const { data: parentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, address, phone, emergency_contact')
      .eq('user_id', user.id)
      .single();

    // Send booking confirmation email to parent
    try {
      console.log('Sending booking confirmation email to parent');

      const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-booking-confirmation', {
        body: {
          bookingId: booking_id,
          parentUserId: user.id,
          parentName: parentProfile ? `${parentProfile.first_name} ${parentProfile.last_name}` : 'Parent',
          sitterName: `${sitter.first_name} ${sitter.last_name}`,
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          numChildren: booking.num_children,
          totalCost: totalCost,
          address: parentProfile?.address || 'Address not provided',
          specialNotes: booking.special_notes,
          preferredLanguage: booking.preferred_language
        }
      });

      if (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't throw error - booking was successful
      } else {
        console.log('Confirmation email sent successfully:', emailData);
      }
    } catch (emailError) {
      console.error('Error calling send-booking-confirmation function:', emailError);
      // Don't throw error - booking was successful
    }

    // Send confirmation email to sitter
    try {
      console.log('Sending booking confirmation email to sitter');

      const { data: sitterEmailData, error: sitterEmailError } = await supabaseClient.functions.invoke('send-sitter-confirmation', {
        body: {
          bookingId: booking_id,
          sitterUserId: sitter.user_id,
          sitterName: `${sitter.first_name} ${sitter.last_name}`,
          parentName: parentProfile ? `${parentProfile.first_name} ${parentProfile.last_name}` : 'Parent',
          parentPhone: parentProfile?.phone || 'Not provided',
          parentAddress: parentProfile?.address || 'Address not provided',
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          numChildren: booking.num_children,
          totalCost: totalCost,
          specialNotes: booking.special_notes,
          preferredLanguage: booking.preferred_language,
          emergencyContact: parentProfile?.emergency_contact
        }
      });

      if (sitterEmailError) {
        console.error('Error sending sitter confirmation email:', sitterEmailError);
        // Don't throw error - booking was successful
      } else {
        console.log('Sitter confirmation email sent successfully:', sitterEmailData);
      }
    } catch (sitterEmailError) {
      console.error('Error calling send-sitter-confirmation function:', sitterEmailError);
      // Don't throw error - booking was successful
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `You've selected ${sitter.first_name} ${sitter.last_name}! Total cost: €${totalCost.toFixed(2)}. You can now proceed with payment.`,
        booking_status: 'confirmed',
        total_cost: totalCost
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
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