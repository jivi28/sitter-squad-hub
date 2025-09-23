import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
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

interface SitterConfirmationRequest {
  bookingId: string;
  sitterUserId: string;
  sitterName: string;
  parentName: string;
  parentPhone: string;
  parentAddress: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numChildren: number;
  totalCost: number;
  specialNotes?: string;
  preferredLanguage?: string;
  emergencyContact?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Sitter confirmation email request received");

    const {
      bookingId,
      sitterUserId,
      sitterName,
      parentName,
      parentPhone,
      parentAddress,
      bookingDate,
      startTime,
      endTime,
      numChildren,
      totalCost,
      specialNotes,
      preferredLanguage,
      emergencyContact
    }: SitterConfirmationRequest = await req.json();

    // Get sitter's email via admin API
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(sitterUserId);
    if (getUserError || !userData?.user?.email) {
      console.error("Failed to resolve sitter email:", getUserError);
      throw new Error("Could not resolve sitter email");
    }

    const sitterEmail = userData.user.email;
    console.log("Sending booking confirmation to sitter:", sitterEmail);

    // Format date for better display
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Congratulations! You've Been Selected! 🎉</h1>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          <h2 style="color: #155724; margin-top: 0;">Great News, ${sitterName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #155724;">
            You have been <strong>selected</strong> by ${parentName} for their babysitting request! 
            Here are all the details you need:
          </p>
        </div>

        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Booking Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
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
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Total Payment:</td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #28a745;">€${totalCost.toFixed(2)}</td>
            </tr>
            ${preferredLanguage ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Preferred Language:</td>
              <td style="padding: 10px 0;">${preferredLanguage}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Parent Contact Information</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Parent Name:</td>
              <td style="padding: 10px 0;">${parentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Phone:</td>
              <td style="padding: 10px 0; font-weight: bold;">${parentPhone}</td>
            </tr>
            <tr${emergencyContact ? ' style="border-bottom: 1px solid #f1f1f1;"' : ''}>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Address:</td>
              <td style="padding: 10px 0;">${parentAddress}</td>
            </tr>
            ${emergencyContact ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Emergency Contact:</td>
              <td style="padding: 10px 0; color: #dc3545; font-weight: bold;">${emergencyContact}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${specialNotes ? `
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Special Instructions</h3>
          <p style="margin: 0; line-height: 1.6; color: #856404; font-style: italic;">
            ${specialNotes}
          </p>
        </div>
        ` : ''}

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1976d2; margin-top: 0;">Important Reminders</h3>
          <ul style="padding-left: 20px; line-height: 1.8; color: #1976d2;">
            <li>Arrive on time (preferably 5-10 minutes early)</li>
            <li>Bring any personal items you might need</li>
            <li>Have the parent's phone number saved in your contacts</li>
            <li>Ask about any house rules or specific routines</li>
            <li>Confirm payment method and amount before the parents leave</li>
            <li>Get emergency contact information if not already provided</li>
          </ul>
        </div>

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #bee5eb;">
          <h3 style="color: #0c5460; margin-top: 0;">Next Steps</h3>
          <p style="margin: 0; line-height: 1.6; color: #0c5460;">
            <strong>1.</strong> Contact ${parentName} at ${parentPhone} to confirm the booking<br>
            <strong>2.</strong> Ask any questions about the children or household<br>
            <strong>3.</strong> Confirm the address and arrival time<br>
            <strong>4.</strong> Mark your calendar for ${formattedDate} at ${startTime}
          </p>
        </div>

        <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px; color: #666;">
          <p style="margin: 0; font-size: 14px;">
            Thank you for being part of our babysitting community!<br>
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      </div>
    `;

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Babysitting Service <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromAddress as string,
      to: [sitterEmail],
      subject: `You've Been Selected! Babysitting on ${formattedDate}`,
      html: emailContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw { message: emailResponse.error.error || "Failed to send email", statusCode: emailResponse.error.statusCode || 500 };
    }

    console.log("Sitter confirmation email sent successfully:", emailResponse.data);

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
    console.error("Error in send-sitter-confirmation function:", error);
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = error?.message || 'Unknown error sending confirmation';
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