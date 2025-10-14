import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SITE_URL =
  process.env.SITE_URL || "https://communityeventsplatform.netlify.app";

export async function handler(event) {
  console.log(
    "🔑 STRIPE_SECRET_KEY detected:",
    !!process.env.STRIPE_SECRET_KEY
  );
  console.log("🔍 STRIPE_SECRET_KEY present:", !!process.env.STRIPE_SECRET_KEY);

  try {
    console.log("Request body:", event.body);
    const { title, price, eventId, userEmail, eventDate } = JSON.parse(
      event.body
    );
    console.log("Parsed data:", {
      title,
      price,
      eventId,
      userEmail,
      eventDate,
    });

    if (!title || !price || isNaN(price)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid event data" }),
      };
    }

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail, // So Stripe knows who paid
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: title, description: `Event on ${eventDate}` },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: eventId,
        event_title: title,
        event_date: eventDate,
      },
      success_url: `${SITE_URL}/success`,
      cancel_url: `${SITE_URL}/cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Stripe session error:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Unknown server error" }),
    };
  }
}
