// scripts/seed-kpi-all.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ADMIN_UID = "e06347e9-3e8b-4c2f-97f6-7c96cbfb7006";
const ADMIN_EMAIL = "bitbazaarplayground@gmail.com";

async function safeInsert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(`Insert failed for ${table}: ${error.message}`);
  return data;
}

async function main() {
  console.log("🚀 Starting KPI + Tickets seeding for admin:", ADMIN_EMAIL);

  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, name");
  if (catErr) throw catErr;
  const catMap = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));

  const events = [
    {
      title: "London Chess Championship 2025",
      description: "An open chess tournament welcoming players of all levels.",
      location: "London, UK",
      date_time: "2025-11-10T10:00:00Z",
      price: 20,
      is_paid: true,
      seats_left: 64,
      image_url:
        "https://images.unsplash.com/photo-1609421142277-9cb2ba06fdd9?w=800&q=80",
      category_name: "Hobbies",
    },
    {
      title: "Tech Innovators Expo 2025",
      description: "AI, robotics, and green tech showcase with workshops.",
      location: "Manchester, UK",
      date_time: "2025-11-15T09:00:00Z",
      price: 75,
      is_paid: true,
      seats_left: 150,
      image_url:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80",
      category_name: "Business",
    },
    {
      title: "Bristol Food & Culture Festival",
      description:
        "Taste dishes from around the world, live bands, and local artisans.",
      location: "Bristol, UK",
      date_time: "2025-11-22T12:00:00Z",
      price: 15,
      is_paid: true,
      seats_left: 250,
      image_url:
        "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80",
      category_name: "Food & Drinks",
    },
    {
      title: "Winter Jazz Night",
      description:
        "Smooth jazz, cocktails, and candlelight in Edinburgh’s city center.",
      location: "Edinburgh, UK",
      date_time: "2025-12-05T19:30:00Z",
      price: 35,
      is_paid: true,
      seats_left: 80,
      image_url:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
      category_name: "Music",
    },
    {
      title: "EcoFuture Summit 2025",
      description:
        "Sustainability conference on renewable energy and circular economy.",
      location: "Birmingham, UK",
      date_time: "2025-12-10T09:00:00Z",
      price: 50,
      is_paid: true,
      seats_left: 100,
      image_url:
        "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800&q=80",
      category_name: "Other",
    },
  ];

  const eventsToInsert = events.map((ev) => ({
    ...ev,
    category_id: catMap.get(ev.category_name.toLowerCase()),
    created_by: ADMIN_UID,
  }));

  const { data: existingEvents } = await supabase
    .from("events")
    .select("id, title")
    .eq("created_by", ADMIN_UID);

  const existingTitles = existingEvents?.map((e) => e.title) || [];
  const newEvents = eventsToInsert.filter(
    (ev) => !existingTitles.includes(ev.title)
  );

  if (newEvents.length) {
    await safeInsert("events", newEvents);
    console.log(`✅ Inserted ${newEvents.length} new events`);
  } else {
    console.log("⚙️ All events already exist — skipping event insert");
  }

  const { data: adminEvents } = await supabase
    .from("events")
    .select("id, title, price")
    .eq("created_by", ADMIN_UID);

  console.log(`📦 Found ${adminEvents.length} admin events`);

  const users = Array.from({ length: 10 }, (_, i) => ({
    email: `kpi_user_${i + 1}@example.com`,
    full_name: `KPI User ${i + 1}`,
    role: "user",
    created_at: new Date().toISOString(),
  }));
  await supabase.from("user_profiles").upsert(users, { onConflict: "email" });
  console.log("✅ Inserted / upserted 10 user profiles");

  const eventPatterns = {
    0: [0, 1],
    1: Array.from({ length: 10 }, (_, i) => i),
    2: [0, 1, 2, 3],
    3: [2, 3, 4],
    4: [4, 5, 6, 7, 8, 9],
  };

  const payments = [];
  const tickets = [];

  for (const [eventIdx, userIdxs] of Object.entries(eventPatterns)) {
    const event = adminEvents[eventIdx];
    if (!event) continue;

    userIdxs.forEach((i) => {
      const email = `kpi_user_${i + 1}@example.com`;
      const qty = Math.random() > 0.7 ? 2 : 1;
      const amount = event.price * qty;
      const created_at = new Date(
        Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000
      ).toISOString();

      payments.push({
        event_id: event.id,
        event_title: event.title,
        user_email: email,
        amount,
        quantity: qty,
        status: "paid",
        created_at,
      });

      for (let t = 0; t < qty; t++) {
        tickets.push({
          event_id: event.id,
          user_email: email,
          qr_data: crypto.randomBytes(12).toString("hex"), // ✅ Fix: unique non-null value
          used: false,
          created_at,
        });
      }
    });
  }

  await safeInsert("payments", payments);
  await safeInsert("tickets", tickets);

  console.log(`💳 Inserted ${payments.length} payments`);
  console.log(`🎟️ Inserted ${tickets.length} tickets`);
  console.log("🎯 KPI + Tickets dataset fully ready for dashboard!");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err.message);
  process.exit(1);
});
