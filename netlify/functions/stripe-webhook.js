// /netlify/functions/stripe-webhook.js
export const config = { bodyParser: false };

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import QRCode from "qrcode";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL =
  process.env.SITE_URL || "https://communityeventsplatform.netlify.app";

export const handler = async (event) => {
  console.log("🔔 Stripe webhook triggered");

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

    // 💳 Payment completed
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const user_email =
        session.customer_email ||
        session.customer_details?.email ||
        session.metadata?.user_email ||
        "guest@example.com";

      const event_id = session.metadata?.event_id;
      const event_title = session.metadata?.event_title || "Untitled Event";
      const event_date = session.metadata?.event_date || null;
      const amount = (session.amount_total || 0) / 100;
      const quantity = Number(session.metadata?.quantity) || 1;

      console.log("💰 Payment success:", {
        user_email,
        event_title,
        amount,
        quantity,
      });

      // ✅ 1. Record payment
      const { data: paymentRow, error: payError } = await supabase
        .from("payments")
        .insert({
          user_email,
          event_id,
          event_title,
          amount,
          quantity,
          status: "succeeded",
        })
        .select("id")
        .single();

      if (payError) {
        console.error("❌ Error saving payment:", payError.message);
        return { statusCode: 500, body: "Payment insert failed" };
      }
      const payment_id = paymentRow.id;
      console.log("✅ Payment record inserted:", payment_id);

      // ✅ 2. Record attendee
      const { error: attError } = await supabase.from("attendees").insert({
        event_id,
        user_email,
        user_name: user_email.split("@")[0],
        paid_amount: amount,
        tickets: quantity,
      });

      if (attError)
        console.error("❌ Error saving attendee:", attError.message);
      else console.log("✅ Attendee record inserted");

      // ✅ 3. Deduct seats
      const { data: eventData, error: fetchError } = await supabase
        .from("events")
        .select("seats_left")
        .eq("id", event_id)
        .single();

      if (fetchError) {
        console.error("⚠️ Failed to fetch seats_left:", fetchError.message);
      } else if (eventData) {
        const newSeatsLeft = Math.max(eventData.seats_left - quantity, 0);
        const { error: updateError } = await supabase
          .from("events")
          .update({ seats_left: newSeatsLeft })
          .eq("id", event_id);
        if (updateError)
          console.error("⚠️ Failed to update seats_left:", updateError.message);
        else
          console.log(
            `✅ Seats updated for ${event_title}: ${newSeatsLeft} remaining`
          );
      }

      // ✅ 4. Generate one ticket per quantity
      for (let i = 0; i < quantity; i++) {
        const ticketId = crypto.randomUUID();
        const verifyUrl = `${SITE_URL}/#/verify/${ticketId}`;
        const qrPayload = `ticket:${ticketId}|event:${event_id}|user:${user_email}`;
        const qrImage = await QRCode.toDataURL(qrPayload);

        const { error: ticketError } = await supabase.from("tickets").insert({
          id: ticketId,
          event_id,
          payment_id,
          user_email,
          qr_data: verifyUrl, // we’ll open this on scan
        });

        if (ticketError)
          console.error("❌ Error inserting ticket:", ticketError.message);
        else console.log(`🎟️ Ticket created for ${user_email}: ${ticketId}`);
      }

      // ✅ 5. Send email with PDF ticket(s)
      try {
        const resp = await fetch(
          "https://actnlispzkojepsmdsss.functions.supabase.co/send-ticket-email",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: {
                id: event_id,
                title: event_title,
                date_time: event_date,
              },
              user: { email: user_email },
            }),
          }
        );

        if (resp.ok) console.log("📧 Ticket email sent successfully!");
        else console.error("⚠️ Ticket email failed:", await resp.text());
      } catch (err) {
        console.error("❌ Error calling send-ticket-email:", err);
      }
    }

    return { statusCode: 200, body: "Webhook received successfully" };
  } catch (err) {
    console.error("❌ Stripe Webhook Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
