import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Rate limiting store (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests = 20, windowMs = 60000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

const sanitizeError = (error: any): string => {
  // Don't expose internal errors for security
  return "An error occurred while checking subscription status";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key for database writes
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Rate limiting check
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`check-subscription:${clientIP}`, 20, 60000)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("User not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error("User not authenticated");
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating to free plan");
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        plan_name: "free",
        plan_type: "free", 
        status: "active",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_end: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_name: "free",
        in_trial: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active and trialing subscriptions
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing", 
      limit: 1,
    });
    
    // Combine both active and trialing subscriptions
    const allSubscriptions = [...activeSubscriptions.data, ...trialingSubscriptions.data];
    const subscriptions = { data: allSubscriptions };

    let subscribed = false;
    let planName = "free";
    let inTrial = false;
    let trialEnd = null;
    let subscriptionEnd = null;
    let cancelAtPeriodEnd = false;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      subscribed = true;
      planName = "premium";
      
      // Check if in trial
      if (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000)) {
        inTrial = true;
        trialEnd = new Date(subscription.trial_end * 1000).toISOString();
      }
      
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        inTrial,
        trialEnd,
        subscriptionEnd,
        cancelAtPeriodEnd
      });
    }

    // Update database with proper upsert
    const { error: upsertError } = await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      plan_name: planName,
      plan_type: planName,
      status: subscribed ? "active" : "inactive",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptions.data[0]?.id || null,
      trial_end: trialEnd,
      current_period_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (upsertError) {
      logStep("Database upsert error", { error: upsertError });
      throw new Error(`Database update failed: ${upsertError.message}`);
    }

    logStep("Database updated", { subscribed, planName, inTrial });

    return new Response(JSON.stringify({
      subscribed,
      plan_name: planName,
      in_trial: inTrial,
      trial_end: trialEnd,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logStep("ERROR in check-subscription", { 
      message: error instanceof Error ? error.message : String(error),
      sanitized: sanitizedError 
    });
    
    return new Response(JSON.stringify({ error: sanitizedError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});