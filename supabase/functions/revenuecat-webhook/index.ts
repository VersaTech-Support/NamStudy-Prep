// @ts-nocheck — This file runs in Supabase's Deno runtime, not Node.js
// Deploy with: supabase functions deploy revenuecat-webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Map RevenueCat event types to subscription status values.
 * Only explicitly handled events modify the subscription_status.
 * Unsupported events (BILLING_ISSUE, UNCANCELLATION, TRANSFER, etc.)
 * are acknowledged but do not alter the database.
 */
const EVENT_STATUS_MAP: Record<string, string> = {
  INITIAL_PURCHASE: "VIP",
  RENEWAL: "VIP",
  EXPIRATION: "FREE",
  CANCELLATION: "FREE",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // ── Webhook secret authentication ──
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("REVENUECAT_WEBHOOK_SECRET is not set in Supabase secrets.");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Parse request body ──
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // RevenueCat sends the event payload under the "event" key
    const event = body?.event;
    if (!event) {
      return new Response(
        JSON.stringify({ error: "Missing event payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appUserId = event.app_user_id;
    const eventType = event.type;

    if (!appUserId || !eventType) {
      return new Response(
        JSON.stringify({ error: "Missing app_user_id or event type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Check if this event type should modify subscription status ──
    const targetStatus = EVENT_STATUS_MAP[eventType];

    if (!targetStatus) {
      // Unsupported event type — acknowledge without modifying status
      return new Response(
        JSON.stringify({ message: `Event type '${eventType}' acknowledged, no status change` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Initialize Supabase admin client (service role — server-side only) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Update subscription status ──
    // app_user_id maps to users.id (set via Purchases.logIn(session.user.id) on the client)
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ subscription_status: targetStatus })
      .eq("id", appUserId);

    if (updateError) {
      console.error(
        `Failed to update subscription_status for user ${appUserId}:`,
        updateError.message
      );
      return new Response(
        JSON.stringify({ error: "Database update failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Subscription status updated",
        user_id: appUserId,
        event_type: eventType,
        new_status: targetStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
