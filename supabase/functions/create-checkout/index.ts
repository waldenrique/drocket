import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Input validation schema
const createCheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: "Plan must be either 'monthly' or 'yearly'" })
  })
});

// Rate limiting store (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests = 10, windowMs = 60000): boolean => {
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
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Invalid input data";
  }
  
  // Don't expose internal errors
  const safeErrors = [
    "Invalid plan selected",
    "User not authenticated", 
    "No active price found for the selected product"
  ];
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return safeErrors.some(safe => errorMessage.includes(safe)) 
    ? errorMessage 
    : "An error occurred while processing your request";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Rate limiting check
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`create-checkout:${clientIP}`, 5, 60000)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Input validation
    const requestBody = await req.json();
    const validatedInput = createCheckoutSchema.parse(requestBody);
    const { plan } = validatedInput;
    logStep("Plan requested", { plan });

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
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer check completed", { customerId, exists: !!customerId });

    // Define product IDs from Stripe
    const productIds = {
      monthly: "prod_SlPQZzYntwtEO2",
      yearly: "prod_SlPR2RREUt9KJa"
    };

    const selectedProductId = productIds[plan as keyof typeof productIds];
    if (!selectedProductId) {
      throw new Error("Invalid plan selected");
    }

    // Get the price for the selected product
    const prices = await stripe.prices.list({
      product: selectedProductId,
      active: true,
      limit: 1
    });

    if (prices.data.length === 0) {
      throw new Error("No active price found for the selected product");
    }

    const priceId = prices.data[0].id;
    logStep("Using existing product and price", { productId: selectedProductId, priceId });

    // Create checkout session with trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 15,
        metadata: {
          user_id: user.id,
          plan_name: "premium"
        }
      },
      success_url: `${req.headers.get("origin")}/pricing?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    logStep("ERROR in create-checkout", { 
      message: error instanceof Error ? error.message : String(error),
      sanitized: sanitizedError 
    });
    
    const status = error instanceof z.ZodError ? 400 : 500;
    return new Response(JSON.stringify({ error: sanitizedError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});