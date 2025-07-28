import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Rate limiting store (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests = 3, windowMs = 60000): boolean => {
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
  // Don't expose internal errors
  const safeErrors = [
    "User not authenticated",
    "No Stripe customer found for this user", 
    "No active subscription found"
  ];
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return safeErrors.some(safe => errorMessage.includes(safe)) 
    ? errorMessage 
    : "An error occurred while cancelling your subscription";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Rate limiting check
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`cancel-subscription:${clientIP}`, 3, 60000)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("User not authenticated");
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error("User not authenticated");
    
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    
    // Find the customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Cancel the subscription at period end
    const cancelledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    logStep("Subscription cancelled at period end", { 
      subscriptionId: cancelledSubscription.id,
      cancelAt: new Date(cancelledSubscription.current_period_end * 1000)
    });

    // Update subscription in Supabase
    await supabaseClient
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        status: "canceling",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    logStep("Updated subscription in database");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Subscription will be cancelled at the end of the current billing period",
      cancelAt: new Date(cancelledSubscription.current_period_end * 1000)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logStep("ERROR in cancel-subscription", { 
      message: error instanceof Error ? error.message : String(error),
      sanitized: sanitizedError 
    });
    
    return new Response(JSON.stringify({ error: sanitizedError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});