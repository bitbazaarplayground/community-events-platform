// scripts/seed-events.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// === Helper Functions ===
async function getUserIdByEmail(email) {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page++;
  }
  throw new Error(`User not found for email: ${email}`);
}

async function ensureCategories(names) {
  const { error } = await admin.from("categories").upsert(
    names.map((n) => ({ name: n })),
    { onConflict: "name" }
  );
  if (error) throw error;
}

const categoryCache = new Map();
async function getCategoryIdByName(name) {
  if (categoryCache.has(name)) return categoryCache.get(name);
  const { data, error } = await admin
    .from("categories")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Category not found: ${name}`);
  categoryCache.set(name, data.id);
  return data.id;
}

// === Upsert Event (supports multiple dates) ===
async function upsertEvent(ev) {
  const payload = {
    title: ev.title,
    description: ev.description,
    location: ev.location,
    date_time: ev.date_time,
    extra_dates: ev.extra_dates ?? [],
    price: ev.price,
    seats: ev.seats,
    seats_left: ev.seats_left ?? ev.seats,
    created_by: ev.created_by,
    image_url: ev.image_url,
    category_id: ev.category_id,
  };

  const { error } = await admin
    .from("events")
    .upsert(payload, { onConflict: "title,date_time" });

  if (error) throw error;
}

// === Categories ===
const CATS = [
  "Music",
  "Nightlife",
  "Performing & Visual Arts",
  "Hobbies",
  "Business",
  "Food & Drinks",
  "Other",
];

// === Event Batches ===
const eventBatches = [
  // Ava’s Events
  {
    adminEmail: "admin.ava@demo.local",
    events: [
      {
        title: "London Startup Pitch",
        description: "Early-stage founders pitch night.",
        location: "London",
        date_time: "2025-11-12 18:30:00",
        extra_dates: [
          "2025-11-19 18:30:00",
          "2025-11-26 18:30:00",
          "2025-12-03 18:30:00",
        ],
        price: "£10",
        seats: 100,
        image_url:
          "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&q=80",
        category_name: "Business",
      },
      {
        title: "London Design Brunch",
        description: "Brunch & discussions on UI/UX design trends.",
        location: "London",
        date_time: "2025-11-16 11:00:00",
        extra_dates: ["2025-11-23 11:00:00", "2025-11-30 11:00:00"],
        price: "£5",
        seats: 60,
        image_url:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
        category_name: "Business",
      },
    ],
  },

  // Sara’s Events
  {
    adminEmail: "admin.sara@demo.local",
    events: [
      {
        title: "London Nightlife DJ Session",
        description: "House & disco classics, late-night set.",
        location: "London",
        date_time: "2025-11-08 22:00:00",
        extra_dates: [
          "2025-11-15 22:00:00",
          "2025-11-22 22:00:00",
          "2025-11-29 22:00:00",
        ],
        price: "£10",
        seats: 200,
        image_url:
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
        category_name: "Nightlife",
      },
      {
        title: "Manchester Jazz Evenings",
        description: "Live jazz with rotating guest performers.",
        location: "Manchester",
        date_time: "2025-11-10 20:00:00",
        extra_dates: [
          "2025-11-17 20:00:00",
          "2025-11-24 20:00:00",
          "2025-12-01 20:00:00",
        ],
        price: "£12",
        seats: 80,
        image_url:
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        category_name: "Music",
      },
    ],
  },

  // Josh’s New Events
  {
    adminEmail: "admin.josh@demo.local",
    events: [
      {
        title: "Bristol Street Food Festival",
        description:
          "A celebration of independent food vendors, music, and craft beer.",
        location: "Bristol",
        date_time: "2025-11-21 12:00:00",
        extra_dates: ["2025-11-22 12:00:00", "2025-11-23 12:00:00"],
        price: "£8",
        seats: 500,
        image_url:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
        category_name: "Food & Drinks",
      },
      {
        title: "Leeds Coding Meetup",
        description:
          "Hands-on sessions on JavaScript frameworks, from beginner to advanced.",
        location: "Leeds",
        date_time: "2025-11-28 18:00:00",
        price: "Free",
        seats: 100,
        image_url:
          "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
        category_name: "Hobbies",
      },
    ],
  },

  // James’s New Events
  {
    adminEmail: "admin.james@demo.local",
    events: [
      {
        title: "Liverpool Film Weekend",
        description:
          "Showcasing indie and international films with Q&A sessions.",
        location: "Liverpool",
        date_time: "2025-11-22 15:00:00",
        extra_dates: ["2025-11-23 15:00:00", "2025-11-24 15:00:00"],
        price: "£9",
        seats: 120,
        image_url:
          "https://images.unsplash.com/photo-1505685296765-3a2736de412f?w=800&q=80",
        category_name: "Performing & Visual Arts",
      },
      {
        title: "Edinburgh Startup Conference",
        description:
          "Panels and networking for founders, investors, and tech enthusiasts.",
        location: "Edinburgh",
        date_time: "2025-11-25 09:00:00",
        extra_dates: ["2025-11-26 09:00:00"],
        price: "£15",
        seats: 250,
        image_url:
          "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&q=80",
        category_name: "Business",
      },
    ],
  },
];

(async () => {
  try {
    console.log("🚀 Starting event seeding...");
    await ensureCategories(CATS);

    for (const batch of eventBatches) {
      const userId = await getUserIdByEmail(batch.adminEmail);
      for (const ev of batch.events) {
        const category_id = await getCategoryIdByName(ev.category_name);
        await upsertEvent({ ...ev, created_by: userId, category_id });
        console.log(`✅ Seeded: ${ev.title}`);
      }
    }

    // 🧾 Log total count
    const { count, error: countErr } = await admin
      .from("events")
      .select("*", { count: "exact", head: true });
    if (countErr) throw countErr;

    console.log(`📊 Total unique events in DB: ${count}`);
    console.log("🎉 All events seeded successfully.");
  } catch (e) {
    console.error("❌ Seeding failed:", e.message);
    process.exit(1);
  }
})();
