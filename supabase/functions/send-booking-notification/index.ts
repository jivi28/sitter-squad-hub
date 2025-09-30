import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface BookingNotificationRequest {
  sitterUserId: string;
  sitterName: string;
  bookingDetails: any;
  bookingId: string;
  serviceType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('send-booking-notification function called');
    
    const { sitterUserId, sitterName, bookingDetails, bookingId, serviceType = 'babysitting' }: BookingNotificationRequest = await req.json();
    
    console.log('Processing booking notification for:', { sitterUserId, sitterName, bookingId });

    // Get sitter's email from auth.users
    const { data: userdata, error: userError } = await supabase.auth.admin.getUserById(sitterUserId);
    
    if (userError || !userdata?.user?.email) {
      console.error('Error getting sitter email:', userError);
      throw new Error(`Could not get sitter email: ${userError?.message || 'No email found'}`);
    }

    const sitterEmail = userdata.user.email;
    console.log('Found sitter email:', sitterEmail);

    // Format booking date and time
    const bookingDate = new Date(bookingDetails.booking_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric",
    });

    const startTime = new Date(`2000-01-01T${bookingDetails.start_time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const endTime = new Date(`2000-01-01T${bookingDetails.end_time}`).toLocaleTimeString("en-US", {
      hour: "numeric", 
      minute: "2-digit",
      hour12: true,
    });

    const serviceTypeLabel = serviceType === 'pet_sitting' ? 'Pet Sitting' : 'Babysitting';
    const subjectLine = serviceType === 'pet_sitting' ? 'New Pet Sitting Request Available!' : 'New Babysitting Request Available!';
    const childrenOrPetsLabel = serviceType === 'pet_sitting' ? 'Pets' : 'Children';

    // Create the email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${subjectLine}</h2>
        
        <p>Hi ${sitterName},</p>
        
        <p>A new ${serviceTypeLabel.toLowerCase()} request has been posted that matches your availability:</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Booking Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>📅 Date:</strong> ${bookingDate}</li>
            <li style="margin: 8px 0;"><strong>🕐 Time:</strong> ${startTime} - ${endTime}</li>
            <li style="margin: 8px 0;"><strong>${serviceType === 'pet_sitting' ? '🐾' : '👶'} ${childrenOrPetsLabel}:</strong> ${bookingDetails.num_children}</li>
            ${bookingDetails.preferred_language ? `<li style="margin: 8px 0;"><strong>🗣️ Language:</strong> ${bookingDetails.preferred_language}</li>` : ''}
            ${bookingDetails.special_notes ? `<li style="margin: 8px 0;"><strong>📝 Special Notes:</strong> ${bookingDetails.special_notes}</li>` : ''}
          </ul>
        </div>
        
        <p>To respond to this request, log in to your sitter dashboard and accept or decline the booking.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get("FRONTEND_URL") || 'https://localhost:8080'}/sitter-auth" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Request
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This request expires in 24 hours. Make sure to respond promptly to secure the booking.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          You're receiving this email because you're a registered babysitter. 
          If you no longer wish to receive these notifications, please update your preferences in your dashboard.
        </p>
      </div>
    `;

    console.log('Sending email to:', sitterEmail);

    const emailResponse = await resend.emails.send({
      from: `BabySitter Platform <${Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev"}>`,
      to: [sitterEmail],
      subject: subjectLine,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification email sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);