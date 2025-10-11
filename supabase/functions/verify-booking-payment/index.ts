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

    // SECURITY: Authenticate user first
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    console.log(`Authenticated user: ${userData.user.id}`);

    // Parse request body
    const { booking_id }: VerificationRequest = await req.json();
    if (!booking_id) {
      throw new Error("Booking ID is required");
    }

    console.log(`Verifying payment for booking: ${booking_id}`);

    // SECURITY: Verify this booking belongs to the authenticated user
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("user_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    if (booking.user_id !== userData.user.id) {
      throw new Error("Unauthorized: This booking does not belong to you");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Search for successful checkout sessions with this booking_id
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      status: 'complete'
    });

    const matchingSession = sessions.data.find((session: any) => 
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
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});