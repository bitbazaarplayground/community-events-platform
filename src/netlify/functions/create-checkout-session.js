// /netlify/functions/create-checkout-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { eventId, title, price } = req.body;

    if (!eventId || !title || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Stripe expects amounts in cents
    const amount = Math.round(Number(price) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: title },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL}/success?eventId=${eventId}`,
      cancel_url: `${process.env.URL}/cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
