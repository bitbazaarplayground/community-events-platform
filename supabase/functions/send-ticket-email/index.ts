// supabase/functions/send-ticket-email/index.js
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf";
import nodemailer from "npm:nodemailer";
import QRCode from "npm:qrcode";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  try {
    const { event, user } = await req.json();
    if (!event?.id || !user?.email) {
      throw new Error("Missing event or user data");
    }

    console.log("🎟 Sending ticket email for:", event.id, user.email);

    // 🧾 Try to fetch full event info if not provided
    let eventData = event;
    const { data: eventInfo } = await supabase
      .from("events")
      .select("title, date_time, location")
      .eq("id", event.id)
      .maybeSingle();
    if (eventInfo) eventData = { ...eventData, ...eventInfo };

    // 🧩 Fetch user's tickets for this event
    const { data: tickets, error: ticketError } = await supabase
      .from("tickets")
      .select("id, qr_data")
      .eq("event_id", event.id)
      .eq("user_email", user.email);

    if (ticketError) {
      console.error("⚠️ Ticket fetch error:", ticketError.message);
    }

    // 📄 If no tickets found, fallback to info-only email
    if (!tickets || tickets.length === 0) {
      console.warn("⚠️ No tickets found for user:", user.email);
      await sendFallbackEmail(eventData, user);
      return new Response("⚠️ Sent fallback email (no tickets)", {
        status: 200,
      });
    }

    // ✨ Create ticket PDF
    const doc = new jsPDF();
    const purple = "#6c63ff";

    doc.setTextColor(purple);
    doc.setFontSize(22);
    doc.text("🎟 Event Ticket(s)", 20, 20);
    doc.setDrawColor(purple);
    doc.setLineWidth(1);
    doc.line(20, 25, 190, 25);

    doc.setTextColor("#000");
    doc.setFontSize(14);
    doc.text(`Event: ${eventData.title}`, 20, 40);
    if (eventData.date_time)
      doc.text(
        `Date: ${new Date(eventData.date_time).toLocaleString()}`,
        20,
        50
      );
    if (eventData.location) doc.text(`Location: ${eventData.location}`, 20, 60);
    doc.text(`Attendee: ${user.name || user.email}`, 20, 70);

    // 🔁 Draw each ticket QR
    let y = 90;
    for (const [i, t] of tickets.entries()) {
      const qrUrl = `https://communityeventsplatform.netlify.app/#/verify/${t.id}`;
      const qrImage = await QRCode.toDataURL(qrUrl);
      doc.text(`Ticket ${i + 1}`, 20, y);
      doc.addImage(qrImage, "PNG", 20, y + 5, 40, 40);
      doc.setFontSize(10);
      doc.text(`Scan or visit: ${qrUrl}`, 70, y + 25);
      y += 55;
      if (y > 270 && i < tickets.length - 1) {
        doc.addPage();
        y = 40;
      }
    }

    doc.setFontSize(10);
    doc.setTextColor("#555");
    doc.text("Please show this QR code at the entrance.", 20, y + 10);
    doc.text("Thank you for supporting Community Events!", 20, y + 17);

    const pdfBytes = doc.output("arraybuffer");

    // ✉️ Send via SMTP (Brevo)
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST"),
      port: Number(Deno.env.get("SMTP_PORT")),
      auth: {
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    // 💌 Email content
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color:#6c63ff;">🎉 Your Tickets for ${eventData.title}</h2>
        <p>Hi ${user.name || user.email},</p>
        <p>Thank you for your purchase! Your PDF tickets are attached below.</p>
        <ul>
          ${tickets
            .map(
              (t, i) =>
                `<li><a href="https://communityeventsplatform.netlify.app/#/verify/${
                  t.id
                }" 
                  style="color:#6c63ff; font-weight:bold;">Ticket ${
                    i + 1
                  }</a></li>`
            )
            .join("")}
        </ul>
        <p>We look forward to seeing you soon!</p>
        <p style="font-size:12px; color:#888;">Community Events Platform</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Community Events" <bitbazaarplayground@gmail.com>`,
      to: user.email,
      subject: `🎟 Your Ticket(s) for ${eventData.title}`,
      html: htmlBody,
      attachments: [
        {
          filename: `tickets_${eventData.title.replace(/\s+/g, "_")}.pdf`,
          content: new Uint8Array(pdfBytes),
        },
      ],
    });

    console.log(`✅ Sent ${tickets.length} tickets to ${user.email}`);
    return new Response("✅ Ticket email sent", { status: 200 });
  } catch (err) {
    console.error("❌ Error in send-ticket-email:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});

async function sendFallbackEmail(event, user) {
  try {
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST"),
      port: Number(Deno.env.get("SMTP_PORT")),
      auth: {
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color:#6c63ff;">🎟 Your Ticket for ${event.title}</h2>
        <p>Hi ${user.email},</p>
        <p>Your ticket details are being processed. If you don’t receive it within 10 minutes, 
        please check your <b>My Tickets</b> section on the site.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Community Events" <bitbazaarplayground@gmail.com>`,
      to: user.email,
      subject: `Ticket confirmation for ${event.title}`,
      html,
    });

    console.log(`📨 Sent fallback email to ${user.email}`);
  } catch (e) {
    console.error("⚠️ Fallback email failed:", e.message);
  }
}
