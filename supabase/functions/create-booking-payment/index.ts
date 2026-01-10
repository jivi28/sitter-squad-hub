import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  booking_id: string;
}

// UUID validation helper
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user from JWT (automatically verified by Supabase)
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (userError || !user?.email) {
      console.error("Authentication error:", userError);
      throw new Error("User not authenticated or email not available");
    }

    // Parse request body
    const { booking_id }: PaymentRequest = await req.json();
    if (!booking_id) {
      throw new Error("Booking ID is required");
    }
    if (!isValidUUID(booking_id)) {
      throw new Error("Invalid booking ID format");
    }

    console.log(`Processing payment for booking: ${booking_id} by user: ${user.id} (${user.email})`);

    // Fetch booking details (no join - sitter_id has no FK)
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("user_id", user.id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      throw new Error("Booking not found or unauthorized");
    }

    if (booking.status !== "confirmed") {
      throw new Error("Only confirmed bookings can be paid");
    }

    if (booking.payment_status === "completed") {
      throw new Error("This booking has already been paid");
    }

    // Fetch sitter name separately
    let sitterName = "Babysitter";
    if (booking.sitter_id) {
      const { data: sitterData } = await supabaseClient
        .from("sitters")
        .select("first_name, last_name")
        .eq("id", booking.sitter_id)
        .single();
      
      if (sitterData) {
        sitterName = `${sitterData.first_name} ${sitterData.last_name}`;
      }
    }

    console.log(`Booking details: ${JSON.stringify(booking)}, Sitter: ${sitterName}`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists, create if needed
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Convert total cost to cents (Stripe expects amounts in cents)
    const amountInCents = Math.round(parseFloat(booking.total_cost) * 100);

    console.log(`Creating payment session for amount: $${booking.total_cost} (${amountInCents} cents)`);

    // sitterName already fetched above

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
            price_data: {
              currency: "eur",
              product_data: {
              name: `Babysitting Service - ${sitterName}`,
              description: `Booking for ${new Date(booking.booking_date).toLocaleDateString()} from ${booking.start_time} to ${booking.end_time}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?booking_id=${booking_id}`,
      cancel_url: `${req.headers.get("origin")}/parent-dashboard`,
      metadata: {
        booking_id: booking_id,
        user_id: user.id,
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating payment session:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});