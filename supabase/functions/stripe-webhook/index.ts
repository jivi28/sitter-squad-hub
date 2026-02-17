import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Webhook event type:", event.type);

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;

      if (!bookingId) {
        console.error("No booking_id in session metadata");
        return new Response(
          JSON.stringify({ error: "No booking_id found" }),
          { status: 400, headers: corsHeaders }
        );
      }

      console.log("Payment completed for booking:", bookingId);

      // Verify booking exists and is in correct state
      const { data: booking, error: fetchError } = await supabaseClient
        .from("bookings")
        .select("id, status, total_cost, user_id, payment_status")
        .eq("id", bookingId)
        .single();

      if (fetchError || !booking) {
        console.error("Booking not found:", bookingId);
        return new Response(
          JSON.stringify({ error: "Booking not found" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Idempotency: skip if already completed
      if (booking.payment_status === "completed") {
        console.log("Payment already completed for booking:", bookingId);
        return new Response(JSON.stringify({ received: true, status: "already_processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Verify booking is in a valid state for payment
      if (booking.status !== "confirmed") {
        console.error("Booking not in confirmed state:", booking.status);
        return new Response(
          JSON.stringify({ error: "Booking not in valid state for payment" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify payment amount matches booking cost
      const paidAmount = session.amount_total; // in cents
      const expectedAmount = Math.round(Number(booking.total_cost) * 100); // convert to cents
      if (paidAmount !== null && paidAmount !== expectedAmount) {
        console.error(`Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`);
        return new Response(
          JSON.stringify({ error: "Payment amount mismatch" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Update booking payment status
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          payment_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("status", "confirmed");

      if (updateError) {
        console.error("Failed to update booking:", updateError);
        throw updateError;
      }

      console.log("Successfully updated booking payment status");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
