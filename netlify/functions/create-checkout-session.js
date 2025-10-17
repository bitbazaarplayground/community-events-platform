// netlify/functions/create-checkout-session.js

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SITE_URL =
  process.env.SITE_URL || "https://communityeventsplatform.netlify.app";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
export async function handler(event) {
  // ✅ Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  console.log("🔑 Stripe key detected:", !!process.env.STRIPE_SECRET_KEY);

  try {
    const {
      title,
      price,
      eventId,
      userEmail,
      eventDate,
      quantity = 1,
    } = JSON.parse(event.body);
    console.log("📦 Parsed request:", {
      title,
      price,
      eventId,
      userEmail,
      eventDate,
      quantity,
    });

    if (!title || !price || isNaN(price)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Invalid event data" }),
      };
    }

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: title, description: `Event on ${eventDate}` },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity,
        },
      ],
      metadata: {
        event_id: eventId,
        event_title: title,
        event_date: eventDate,
        quantity,
      },
      success_url: `${SITE_URL}/success`,
      cancel_url: `${SITE_URL}/cancel`,
    });
    // 🛑 Check available seats before allowing checkout
    const { data: eventData, error: fetchError } = await supabase
      .from("events")
      .select("seats_left")
      .eq("id", eventId)
      .single();

    if (fetchError || !eventData) {
      console.error("❌ Error fetching event:", fetchError?.message);
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    // ❗ Prevent overbooking
    if (quantity > eventData.seats_left) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Not enough tickets left. Only ${eventData.seats_left} available.`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Stripe session error:", error.message);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: error.message || "Unknown server error" }),
    };
  }
}
