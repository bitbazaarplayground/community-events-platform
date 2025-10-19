// scripts/seed-events2.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

// Initialize admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Admin info
const ADMIN_UID = "e06347e9-3e8b-4c2f-97f6-7c96cbfb7006";
const ADMIN_EMAIL = "bitbazaarplayground@gmail.com";

// Helper: fetch category IDs
async function getCategoryIds() {
  const { data, error } = await supabase.from("categories").select("id, name");
  if (error) throw new Error("❌ Error fetching categories: " + error.message);

  const catMap = new Map();
  data.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));
  return catMap;
}

// Helper: safely insert rows
async function safeInsert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error)
    throw new Error(`❌ Error inserting into ${table}: ${error.message}`);
  return data;
}

async function main() {
  console.log("🚀 Starting KPI seeding for admin:", ADMIN_EMAIL);
  const categories = await getCategoryIds();
  console.log("📂 Found categories:", [...categories.keys()].join(", "));

  // === 5 Events ===
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
        "https://images.unsplash.com/photo-1617196035520-8ce2e3f7b07a?w=800&q=80",
      category_name: "Hobbies",
    },
    {
      title: "Tech Innovators Expo 2025",
      description:
        "AI, robotics, and green tech showcase with networking and workshops.",
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

  // ✅ Attach category_id & remove category_name
  const eventsToInsert = events.map((ev) => {
    const category_id = categories.get(ev.category_name.toLowerCase()) ?? null;
    const { category_name, ...rest } = ev;
    return { ...rest, category_id, created_by: ADMIN_UID };
  });

  const insertedEvents = await safeInsert("events", eventsToInsert);
  console.log(`✅ Inserted ${insertedEvents.length} events`);

  // === Create 10 fake users ===
  const fakeUsers = Array.from({ length: 10 }, (_, i) => ({
    email: `kpi_user_${i + 1}@example.com`,
    name: `KPI User ${i + 1}`,
  }));

  let insertedUsers = [];
  try {
    insertedUsers = await safeInsert("users", fakeUsers);
    console.log(`✅ Inserted ${insertedUsers.length} test users`);
  } catch (err) {
    console.warn("⚠️ Skipped user insert:", err.message);
  }

  // === Simulate bookings ===
  const bookingPatterns = {
    0: [insertedUsers[0], insertedUsers[1]], // chess
    1: insertedUsers, // tech expo
    2: insertedUsers.slice(0, 4), // food fest
    3: insertedUsers.slice(2, 5), // jazz
    4: insertedUsers.slice(5, 11 - 1), // eco summit
  };

  const allBookings = [];
  for (const [index, users] of Object.entries(bookingPatterns)) {
    const event = insertedEvents[index];
    users.forEach((user) => {
      if (event && user) {
        allBookings.push({
          event_id: event.id,
          user_email: user.email,
          booked_at: new Date().toISOString(),
        });
      }
    });
  }

  if (allBookings.length > 0) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert(allBookings)
        .select();
      if (error) throw error;
      console.log(`🎟️ Inserted ${data.length} simulated bookings`);
    } catch (err) {
      console.warn("⚠️ Could not insert into 'bookings' table:", err.message);
    }
  }

  console.log(
    "🎯 Seeding complete — verify events, users, and bookings in Supabase!"
  );
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
