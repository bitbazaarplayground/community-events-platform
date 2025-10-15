import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { jsPDF } from "npm:jspdf";
import nodemailer from "npm:nodemailer";
import QRCode from "npm:qrcode";

serve(async (req) => {
  try {
    const { event, user } = await req.json();

    // ✅ Generate QR code
    const qrData = `EVENT:${event.id}|USER:${user.email}`;
    const qrImage = await QRCode.toDataURL(qrData, { width: 150 });

    // ✅ Create PDF Ticket with purple branding
    const doc = new jsPDF();
    const purple = "#6c63ff";

    doc.setTextColor(purple);
    doc.setFontSize(22);
    doc.text("🎟 Event Ticket", 20, 20);

    // Divider bar
    doc.setDrawColor(purple);
    doc.setLineWidth(1);
    doc.line(20, 25, 190, 25);

    // Event info
    doc.setTextColor("#000");
    doc.setFontSize(14);
    doc.text(`Event: ${event.title}`, 20, 40);
    if (event.date_time)
      doc.text(`Date: ${new Date(event.date_time).toLocaleString()}`, 20, 50);
    if (event.location) doc.text(`Location: ${event.location}`, 20, 60);
    doc.text(`Attendee: ${user.name || user.email}`, 20, 70);

    // Add QR Code
    doc.addImage(qrImage, "PNG", 20, 85, 50, 50);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor("#555");
    doc.text("Please show this QR code at the entrance.", 20, 150);
    doc.text("Thank you for supporting Community Events!", 20, 157);

    const pdfBytes = doc.output("arraybuffer");

    // ✅ Configure Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST"),
      port: Number(Deno.env.get("SMTP_PORT")),
      auth: {
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    // ✅ Build branded HTML email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <h2 style="color: #6c63ff;">🎉 Your Ticket for ${event.title}</h2>
        <p>Hi ${user.name || user.email},</p>
        <p>Thank you for your purchase! Your ticket for <strong>${
          event.title
        }</strong> is attached as a PDF.</p>
        
        <div style="border-left: 4px solid #6c63ff; padding-left: 10px; margin: 10px 0;">
          <p style="margin: 4px 0;"><b>Event ID:</b> ${event.id}</p>
          ${
            event.date_time
              ? `<p style="margin: 4px 0;"><b>Date:</b> ${new Date(
                  event.date_time
                ).toLocaleString()}</p>`
              : ""
          }
          ${
            event.location
              ? `<p style="margin: 4px 0;"><b>Location:</b> ${event.location}</p>`
              : ""
          }
        </div>

        <p>You can also find your ticket anytime in your 
          <a href="https://communityeventsplatform.netlify.app/#/mytickets" style="color: #6c63ff; text-decoration: none; font-weight: bold;">
            My Tickets
          </a> section.
        </p>

        <p>We look forward to seeing you at the event! 🎶</p>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">
          Sent by <a href="https://communityeventsplatform.netlify.app" style="color: #6c63ff; text-decoration: none;">Community Events</a>
        </p>
      </div>
    `;

    // ✅ Send email
    await transporter.sendMail({
      from: `"Events Platform" <bitbazaarplayground@gmail.com>`,
      to: user.email,
      subject: `Your Ticket for ${event.title}`,
      text: `Hi ${user.name || user.email}, your ticket for ${
        event.title
      } is attached.`,
      html: htmlBody,
      attachments: [
        {
          filename: `ticket_${event.title}.pdf`,
          content: new Uint8Array(pdfBytes), // ✅ Deno-safe version
        },
      ],
    });

    console.log(`📧 Email with ticket sent to ${user.email}`);
    return new Response("✅ Ticket email sent successfully", { status: 200 });
  } catch (err) {
    console.error("❌ Error sending ticket email:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
