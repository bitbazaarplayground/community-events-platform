// /netlify/functions/create-checkout-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  try {
    const { title, price } = JSON.parse(event.body);

    if (!title || !price || isNaN(price)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid event data" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: title },
            unit_amount: Math.round(Number(price) * 100), // Stripe expects amount in pence
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL}/success`,
      cancel_url: `${process.env.SITE_URL}/cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Stripe session error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
