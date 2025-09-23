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

interface ParentNotificationRequest {
  bookingId: string;
  sitterName: string;
  sitterPhone?: string;
  sitterExperience?: string;
  sitterHourlyRate: number;
  parentUserId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numChildren: number;
  responseMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parent notification email request received");

    const {
      bookingId,
      sitterName,
      sitterPhone,
      sitterExperience,
      sitterHourlyRate,
      parentUserId,
      bookingDate,
      startTime,
      endTime,
      numChildren,
      responseMessage
    }: ParentNotificationRequest = await req.json();

    // Get parent's email via admin API
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(parentUserId);
    if (getUserError || !userData?.user?.email) {
      console.error("Failed to resolve parent email:", getUserError);
      throw new Error("Could not resolve parent email");
    }

    const parentEmail = userData.user.email;
    console.log("Sending sitter application notification to:", parentEmail);

    // Format date for better display
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate total estimated cost
    const startTimeDate = new Date(`1970-01-01T${startTime}`);
    const endTimeDate = new Date(`1970-01-01T${endTime}`);
    const hours = (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60 * 60);
    const estimatedCost = hours * sitterHourlyRate;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">New Sitter Application! 🙋‍♀️</h1>
        
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #28a745; margin-top: 0;">Great News!</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            <strong>${sitterName}</strong> has applied for your babysitting request. 
            Here are the details:
          </p>
        </div>

        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Booking Request</h3>
          
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
          </table>
        </div>

        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Sitter Information</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Name:</td>
              <td style="padding: 10px 0;">${sitterName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Hourly Rate:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #28a745;">€${sitterHourlyRate}/hour</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Estimated Total:</td>
              <td style="padding: 10px 0; font-size: 16px; font-weight: bold; color: #28a745;">€${estimatedCost.toFixed(2)}</td>
            </tr>
            ${sitterPhone ? `
            <tr style="border-bottom: 1px solid #f1f1f1;">
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Phone:</td>
              <td style="padding: 10px 0;">${sitterPhone}</td>
            </tr>
            ` : ''}
            ${sitterExperience ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Experience:</td>
              <td style="padding: 10px 0;">${sitterExperience}</td>
            </tr>
            ` : ''}
          </table>

          ${responseMessage ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2;">Message from ${sitterName}:</h4>
            <p style="margin: 0; font-style: italic;">${responseMessage}</p>
          </div>
          ` : ''}
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">What's Next?</h3>
          <p style="margin: 0; line-height: 1.6; color: #856404;">
            Visit your dashboard to review all applications for this booking and select your preferred sitter. 
            Once you make your selection, both you and the sitter will receive confirmation details.
          </p>
        </div>

        <div style="text-align: center; padding: 20px;">
          <a href="${supabaseUrl.replace('supabase.co', 'vercel.app')}/parent-dashboard" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View Applications
          </a>
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
      to: [parentEmail],
      subject: `New Application from ${sitterName} - ${formattedDate}`,
      html: emailContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw { message: emailResponse.error.error || "Failed to send email", statusCode: emailResponse.error.statusCode || 500 };
    }

    console.log("Parent notification email sent successfully:", emailResponse.data);

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
    console.error("Error in send-parent-notification function:", error);
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = error?.message || 'Unknown error sending notification';
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