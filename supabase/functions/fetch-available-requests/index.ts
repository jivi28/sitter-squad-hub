import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toMinutes(time: string) {
  // Accepts "HH:MM" or "HH:MM:SS"
  const [h, m] = time.split(":");
  return parseInt(h) * 60 + parseInt(m || "0");
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string) {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  return s1 < e2 && e1 > s2;
}

function getDayName(dateStr: string) {
  // force UTC to avoid TZ drift
  const date = new Date(`${dateStr}T00:00:00Z`);
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][date.getUTCDay()];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      console.error("Auth getUser error:", userError);
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Fetch sitter profile
    const { data: sitter, error: sitterError } = await supabase
      .from("sitters")
      .select("id, availability, approved_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (sitterError || !sitter) {
      console.error("Sitter fetch error:", sitterError);
      return new Response(JSON.stringify({ error: "Sitter profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sitter.approved_at) {
      return new Response(JSON.stringify({ error: "Sitter not approved" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const availability: Array<{ day: string; startTime: string; endTime: string }> =
      Array.isArray(sitter.availability) ? sitter.availability : [];

    // If no availability, nothing to show
    if (availability.length === 0) {
      return new Response(JSON.stringify({ requests: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending and received_responses bookings that haven't expired
    const nowIso = new Date().toISOString();
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, num_children, total_cost, status, special_notes, preferred_language, user_id, request_expires_at, created_at, service_type")
      .in("status", ["pending", "received_responses"])
      .gt("request_expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Bookings fetch error:", bookingsError);
      return new Response(JSON.stringify({ error: "Failed to fetch bookings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch parent profiles for matched bookings
    const parentUserIds = [...new Set((bookings || []).map((b: any) => b.user_id))];
    const profilesMap: Record<string, any> = {};
    if (parentUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, children_ages, special_needs")
        .in("user_id", parentUserIds);
      for (const p of (profiles || [])) {
        profilesMap[p.user_id] = p;
      }
    }

    // Exclude requests already responded to by this sitter
    const { data: responses, error: respError } = await supabase
      .from("booking_responses")
      .select("booking_id")
      .eq("sitter_id", sitter.id);

    if (respError) {
      console.error("Responses fetch error:", respError);
    }

    const respondedIds = new Set((responses || []).map((r: any) => r.booking_id));

    // Filter by availability and non-responded
    const filtered = (bookings || []).filter((b: any) => {
      if (respondedIds.has(b.id)) return false;
      const reqDay = getDayName(b.booking_date);
      return availability.some((slot) => {
        return (
          slot.day === reqDay &&
          timesOverlap(
            (b.start_time as string),
            (b.end_time as string),
            slot.startTime,
            slot.endTime,
          )
        );
      });
    });

    return new Response(JSON.stringify({ requests: filtered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-available-requests error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});