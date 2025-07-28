import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };

    // Only handle signup confirmations
    if (email_action_type === "signup") {
      const confirmationUrl = `https://uyuvlruokmgpxogetybp.supabase.co/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

      const emailResponse = await resend.emails.send({
        from: "Rocketlink <onboarding@resend.dev>",
        to: [user.email],
        subject: "Welcome to Rocketlink - Please confirm your email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Welcome to Rocketlink!</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
              <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Welcome to our system!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Thank you for joining Rocketlink. To get started with creating your bio page and managing your links, 
                please confirm your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Confirm Email Address
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; margin-top: 25px;">
                If the button doesn't work, you can also copy and paste this link into your browser:<br>
                <a href="${confirmationUrl}" style="color: #007bff; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 14px;">
              <p>If you didn't create an account with Rocketlink, you can safely ignore this email.</p>
              <p style="margin-top: 20px;">
                <strong>Rocketlink Team</strong><br>
                Your Bio Link Solution
              </p>
            </div>
          </div>
        `,
      });

      console.log("Confirmation email sent successfully:", emailResponse);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);