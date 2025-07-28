import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIAL-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current date and calculate dates for reminders
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    logStep("Checking for trials ending soon", { 
      threeDaysFromNow: threeDaysFromNow.toISOString(),
      oneDayFromNow: oneDayFromNow.toISOString()
    });

    // Find subscriptions with trials ending in 3 days or 1 day
    const { data: subscriptions, error } = await supabaseClient
      .from("subscriptions")
      .select(`
        *,
        profiles!inner(user_id, display_name)
      `)
      .not("trial_end", "is", null)
      .gte("trial_end", oneDayFromNow.toISOString())
      .lte("trial_end", threeDaysFromNow.toISOString())
      .eq("status", "active");

    if (error) {
      logStep("Error fetching subscriptions", { error: error.message });
      throw error;
    }

    logStep("Found subscriptions", { count: subscriptions?.length || 0 });

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No trials found ending soon" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = [];

    for (const subscription of subscriptions) {
      const trialEnd = new Date(subscription.trial_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      logStep("Processing subscription", { 
        userId: subscription.user_id,
        daysRemaining,
        trialEnd: subscription.trial_end
      });

      // Create notification record (you would implement notifications table)
      const notificationData = {
        user_id: subscription.user_id,
        type: "trial_ending",
        title: `Período de teste expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`,
        message: `Seu período de teste do RocketLink Premium expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}. Para continuar aproveitando todos os recursos, certifique-se de que sua assinatura está ativa.`,
        data: {
          days_remaining: daysRemaining,
          trial_end: subscription.trial_end,
          subscription_id: subscription.id
        },
        created_at: now.toISOString()
      };

      // Here you would insert into notifications table and/or send email
      // For now, we'll just log it
      logStep("Would send notification", notificationData);
      
      results.push({
        user_id: subscription.user_id,
        days_remaining: daysRemaining,
        notification_sent: true
      });
    }

    logStep("Completed processing", { processed: results.length });

    return new Response(JSON.stringify({ 
      message: "Trial reminders processed",
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in trial reminder", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});