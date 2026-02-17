import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role for server-side lookups
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface BookingConfirmationRequest {
  bookingId: string;
  parentEmail?: string;
  parentUserId?: string;
  parentName: string;
  sitterName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numChildren: number;
  totalCost: number;
  address: string;
  specialNotes?: string;
  preferredLanguage?: string;
}

// Input validation helper
const validateBookingData = (data: BookingConfirmationRequest): void => {
  if (!data.bookingId || typeof data.bookingId !== 'string') {
    throw new Error('Invalid booking ID');
  }
  if (!data.parentName || data.parentName.trim().length === 0) {
    throw new Error('Parent name is required');
  }
  if (!data.sitterName || data.sitterName.trim().length === 0) {
    throw new Error('Sitter name is required');
  }
  if (!data.bookingDate || isNaN(Date.parse(data.bookingDate))) {
    throw new Error('Invalid booking date');
  }
  if (typeof data.numChildren !== 'number' || data.numChildren < 1) {
    throw new Error('Invalid number of children');
  }
  if (typeof data.totalCost !== 'number' || data.totalCost < 0) {
    throw new Error('Invalid total cost');
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal function secret to prevent unauthorized external calls
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
    if (!expectedSecret || internalSecret !== expectedSecret) {
      console.error("Unauthorized call to send-booking-confirmation: invalid internal secret");
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestData: BookingConfirmationRequest = await req.json();
    
    // Validate input data
    validateBookingData(requestData);

    const {
      bookingId,
      parentEmail,
      parentUserId,
      parentName,
      sitterName,
      bookingDate,
      startTime,
      endTime,
      numChildren,
      totalCost,
      address,
      specialNotes,
      preferredLanguage
    } = requestData;

    // Resolve parent's email: prefer provided, otherwise fetch via admin API using service role
    let resolvedParentEmail = parentEmail;
    if (!resolvedParentEmail) {
      if (!parentUserId) {
        throw new Error("Missing parent email and parentUserId");
      }
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(parentUserId);
      if (getUserError || !userData?.user?.email) {
        console.error("Failed to resolve parent email via admin.getUserById:", getUserError);
        throw new Error("Could not resolve parent email");
      }
      resolvedParentEmail = userData.user.email;
    }

    // Format date for better display
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Booking Confirmed! 🎉</h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #28a745; margin-top: 0;">Great News, ${parentName}!</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Your babysitting request has been <strong>confirmed</strong> by ${sitterName}. 
            Here are the details of your booking:
          </p>
        </div>

        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Booking Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Sitter:</td>
              <td style="padding: 10px 0;">${sitterName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Date:</td>
              <td style="padding: 10px 0;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Time:</td>
              <td style="padding: 10px 0;">${startTime} - ${endTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Children:</td>
              <td style="padding: 10px 0;">${numChildren} ${numChildren === 1 ? 'child' : 'children'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Total Cost:</td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #28a745;">€${totalCost}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Address:</td>
              <td style="padding: 10px 0;">${address}</td>
            </tr>
            ${preferredLanguage ? `
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Preferred Language:</td>
              <td style="padding: 10px 0;">${preferredLanguage}</td>
            </tr>
            ` : ''}
          </table>
          
          ${specialNotes ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0; color: #666;">Special Notes:</h4>
            <p style="margin: 0; font-style: italic;">${specialNotes}</p>
          </div>
          ` : ''}
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1976d2; margin-top: 0;">What's Next?</h3>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>Make sure you have ${sitterName}'s contact information</li>
            <li>Prepare any specific instructions for your children</li>
            <li>Have payment ready (€${totalCost})</li>
            <li>Be available to answer any last-minute questions</li>
          </ul>
        </div>

        <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px; color: #666;">
          <p style="margin: 0; font-size: 14px;">
            Thank you for using our babysitting service!<br>
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      </div>
    `;

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Babysitting Service <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromAddress as string,
      to: [resolvedParentEmail],
      subject: `Booking Confirmed with ${sitterName} - ${formattedDate}`,
      html: emailContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw { message: emailResponse.error.message || "Failed to send email", statusCode: 500 };
    }

    console.log("Email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    const statusCode = typeof error?.statusCode === 'number' ? (error.statusCode === 403 ? 400 : error.statusCode) : 500;
    const message = error?.message || 'Unknown error sending email';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);