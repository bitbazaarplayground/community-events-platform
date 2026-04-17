// netlify/functions/create-checkout-session.js
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
    const body = JSON.parse(event.body);
    const {
      items,
      title,
      price,
      eventId,
      userEmail,
      eventDate,
      quantity = 1,
    } = body;

    // 🧾 Normalize input: support single item OR multiple items
    const basketItems =
      Array.isArray(items) && items.length > 0
        ? items
        : [
            {
              eventId,
              title,
              price,
              eventDate,
              quantity,
            },
          ];

    if (!basketItems || basketItems.length === 0) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No valid items found in request" }),
      };
    }

    console.log("🛒 Checkout items:", basketItems);

    // ✅ Validate all basket items exist and have enough seats
    for (const item of basketItems) {
      const { data: eventData, error: fetchError } = await supabase
        .from("events")
        .select("seats_left")
        .eq("id", item.eventId)
        .single();

      if (fetchError || !eventData) {
        console.error("❌ Event not found:", item.eventId);
        return {
          statusCode: 404,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: `Event not found: ${item.title}` }),
        };
      }

      if (item.quantity > eventData.seats_left) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: `Not enough tickets left for "${item.title}". Only ${eventData.seats_left} available.`,
          }),
        };
      }
    }

    // ✅ Create Stripe line items
    const line_items = basketItems.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          description: item.eventDate
            ? `Event on ${new Date(item.eventDate).toLocaleDateString()}`
            : "Event Ticket",
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      metadata: {
        user_email: userEmail || "",
        basket_json: JSON.stringify(
          basketItems.map((item) => ({
            event_id: item.eventId,
            event_title: item.title,
            event_date: item.eventDate || "",
            quantity: item.quantity || 1,
            price: item.price || 0,
          }))
        ),
      },
    });

    console.log("✅ Stripe session created:", session.id);

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
