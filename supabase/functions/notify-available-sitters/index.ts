import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface NotificationRequest {
  booking_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  num_children?: number;
  special_notes?: string;
  preferred_language?: string;
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

    const { booking_id, booking_date, start_time, end_time, num_children, special_notes, preferred_language }: NotificationRequest = await req.json();

    console.log('Processing notification request:', { booking_id, booking_date, start_time, end_time });

    // Get day of week from booking date
    const bookingDate = new Date(booking_date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const requestedDay = days[bookingDate.getDay()];

    console.log('Requested day:', requestedDay);

    // Check if times overlap
    const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return start1 < end2 && end1 > start2;
    };

    // Find available sitters
    const { data: sitters, error: sittersError } = await supabaseClient
      .from('sitters')
      .select('id, user_id, first_name, last_name, availability')
      .or('status.eq.approved,approved_at.not.is.null');

    if (sittersError) {
      console.error('Error fetching sitters:', sittersError);
      throw sittersError;
    }

    console.log(`Found ${sitters?.length || 0} approved sitters`);

    // Filter sitters by availability
    const availableSitters = sitters?.filter(sitter => {
      if (!sitter.availability || !Array.isArray(sitter.availability)) {
        return false;
      }

      return sitter.availability.some((slot: AvailabilitySlot) => {
        const dayMatch = slot.day === requestedDay;
        const timeMatch = timesOverlap(start_time, end_time, slot.startTime, slot.endTime);
        return dayMatch && timeMatch;
      });
    }) || [];

    console.log(`Found ${availableSitters.length} available sitters for the requested time`);

    // Send email notifications to available sitters
    let emailsSent = 0;
    let emailErrors = 0;
    
    for (const sitter of availableSitters) {
      try {
        console.log(`Sending notification email to sitter: ${sitter.first_name} ${sitter.last_name} (User ID: ${sitter.user_id})`);
        
        const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-booking-notification', {
          body: {
            sitterUserId: sitter.user_id,
            sitterName: `${sitter.first_name} ${sitter.last_name}`,
            bookingDetails: {
              booking_id,
              booking_date,
              start_time,
              end_time,
              num_children: num_children || 1,
              special_notes,
              preferred_language
            },
            bookingId: booking_id
          }
        });

        if (emailError) {
          console.error(`Error sending email to sitter ${sitter.id}:`, emailError);
          emailErrors++;
        } else {
          console.log(`Email sent successfully to sitter ${sitter.id}`);
          emailsSent++;
        }
      } catch (error) {
        console.error(`Error processing email for sitter ${sitter.id}:`, error);
        emailErrors++;
      }
    }

    console.log(`Email notification summary: ${emailsSent} sent, ${emailErrors} errors`);

    // Store which sitters were notified (for future tracking)
    const notificationRecords = availableSitters.map(sitter => ({
      booking_id,
      sitter_id: sitter.id,
      notified_at: new Date().toISOString(),
      notification_type: 'system' // Could be 'email', 'push', etc.
    }));

    // You could create a notifications table to track this
    // const { error: notificationError } = await supabaseClient
    //   .from('booking_notifications')
    //   .insert(notificationRecords);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Found ${availableSitters.length} available sitters, sent ${emailsSent} email notifications`,
        available_sitters: availableSitters.length,
        emailsSent,
        emailErrors,
        sitters: availableSitters.map(s => ({ 
          id: s.id, 
          name: `${s.first_name} ${s.last_name}` 
        }))
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in notify-available-sitters function:', error);
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