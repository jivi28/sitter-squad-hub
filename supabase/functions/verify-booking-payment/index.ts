import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  booking_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for database updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { booking_id }: VerificationRequest = await req.json();
    if (!booking_id) {
      throw new Error("Booking ID is required");
    }

    console.log(`Verifying payment for booking: ${booking_id}`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Search for successful checkout sessions with this booking_id
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      status: 'complete'
    });

    const matchingSession = sessions.data.find(session => 
      session.metadata?.booking_id === booking_id && session.payment_status === 'paid'
    );

    if (!matchingSession) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No completed payment found for this booking" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found completed payment session: ${matchingSession.id}`);

    // Update booking payment status
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({ 
        payment_status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", booking_id);

    if (updateError) {
      throw new Error(`Failed to update booking payment status: ${updateError.message}`);
    }

    console.log(`Successfully updated payment status for booking: ${booking_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment verified and booking updated" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});