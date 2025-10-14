export const config = {
  bodyParser: false,
};

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  console.log("🔔 Stripe webhook triggered");
  console.log("Signature header:", event.headers["stripe-signature"]);
  console.log("Webhook secret present:", !!process.env.STRIPE_WEBHOOK_SECRET);

  try {
    const sig = event.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const user_email = session.customer_email;
      const event_id = session.metadata?.event_id;
      const event_title = session.metadata?.event_title;
      const amount = session.amount_total / 100;

      console.log("💰 Payment success:", user_email, event_title);

      const { error: payError } = await supabase.from("payments").insert({
        user_email,
        event_id,
        event_title,
        amount,
        status: "succeeded",
      });

      if (payError) console.error("❌ Error saving payment:", payError.message);
      else console.log("✅ Payment record inserted");

      const { error: attError } = await supabase.from("attendees").insert({
        event_id,
        user_email,
        user_name: user_email.split("@")[0],
        paid_amount: amount,
      });

      if (attError)
        console.error("❌ Error saving attendee:", attError.message);
      else console.log("✅ Attendee record inserted");
    }

    return { statusCode: 200, body: "Webhook received successfully" };
  } catch (err) {
    console.error("❌ Stripe Webhook Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
