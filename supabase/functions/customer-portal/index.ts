import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

// Rate limiting store (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests = 5, windowMs = 60000): boolean => {
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
    "configuration",
    "Você precisa ter uma assinatura",
    "portal do cliente não está configurado"
  ];
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return safeErrors.some(safe => errorMessage.includes(safe)) 
    ? errorMessage 
    : "An error occurred while accessing the customer portal";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Rate limiting check
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`customer-portal:${clientIP}`, 5, 60000)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // Create customer if doesn't exist but no subscription means they can't access portal
      return new Response(JSON.stringify({ 
        error: "Você precisa ter uma assinatura ativa para acessar o portal de gerenciamento. Por favor, assine um plano primeiro." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check if customer has any subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Você precisa ter uma assinatura para acessar o portal de gerenciamento. Por favor, assine um plano primeiro." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/pricing`,
      });
      
      logStep("Customer portal session created", { sessionId: portalSession.id });

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      logStep("Stripe portal error", { error: stripeError.message });
      
      if (stripeError.message.includes("configuration")) {
        return new Response(JSON.stringify({ 
          error: "O portal do cliente não está configurado. Configure-o no Stripe Dashboard em Settings > Billing > Customer Portal." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      throw stripeError;
    }

  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logStep("ERROR in customer-portal", { 
      message: error instanceof Error ? error.message : String(error),
      sanitized: sanitizedError 
    });
    
    return new Response(JSON.stringify({ error: sanitizedError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});