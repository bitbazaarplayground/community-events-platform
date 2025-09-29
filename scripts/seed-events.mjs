// scripts/seed-events.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Helpers */
async function getUserIdByEmail(email) {
  // List users (paged) and find by email
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
  throw new Error(`Auth user not found for email: ${email}`);
}

async function ensureCategories(names) {
  // idempotent: insert missing, ignore existing
  const rows = names.map((n) => ({ name: n }));
  const { error } = await admin
    .from("categories")
    .upsert(rows, { onConflict: "name" });
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

// Idempotent upsert using unique index on (title, date_time)
async function upsertEvent(ev) {
  const payload = {
    title: ev.title,
    description: ev.description,
    location: ev.location,
    date_time: ev.date_time,
    price: ev.price,
    seats: ev.seats,
    seats_left: ev.seats_left ?? ev.seats,
    created_by: ev.created_by,
    image_url: ev.image_url,
    category_id: ev.category_id,
  };

  const { error } = await admin
    .from("events")
    .upsert(payload, { onConflict: "title,date_time" }); // uses the unique index we created

  if (error) throw error;
}

/** ---- Seed data ---- */
const CATS = [
  "Music",
  "Nightlife",
  "Performing & Visual Arts",
  "Hobbies",
  "Business",
  "Food & Drinks",
  "Other",
];

// Define events per admin
const eventBatches = [
  {
    adminEmail: "admin.ava@demo.local",
    events: [
      {
        title: "London Tech Breakfast",
        description: "Morning tech talks & networking over pastries.",
        location: "London",
        date_time: "2025-11-05 08:30:00",
        price: "Free",
        seats: 80,
        image_url:
          "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800&q=80",
        category_name: "Business",
      },
      {
        title: "Manchester Indie Night",
        description: "Live indie bands and local brews.",
        location: "Manchester",
        date_time: "2025-11-07 20:00:00",
        price: "£15",
        seats: 120,
        image_url:
          "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
        category_name: "Music",
      },
      {
        title: "Birmingham Art Walk",
        description: "Guided gallery hop with curators.",
        location: "Birmingham",
        date_time: "2025-11-09 14:30:00",
        price: "Free",
        seats: 60,
        image_url:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
        category_name: "Performing & Visual Arts",
      },
      {
        title: "London Startup Pitch",
        description: "Early-stage founders pitch night.",
        location: "London",
        date_time: "2025-11-12 18:30:00",
        price: "£10",
        seats: 100,
        image_url:
          "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&q=80",
        category_name: "Business",
      },
      {
        title: "Manchester Coffee & Code",
        description: "Casual JS/TS coding session.",
        location: "Manchester",
        date_time: "2025-11-14 10:00:00",
        price: "Free",
        seats: 40,
        image_url:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
        category_name: "Hobbies",
      },
    ],
  },
  {
    adminEmail: "admin.josh@demo.local",
    events: [
      {
        title: "Birmingham Street Food Tour",
        description: "A walking tour of independent street food spots.",
        location: "Birmingham",
        date_time: "2025-11-06 18:00:00",
        price: "£12",
        seats: 50,
        image_url:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
        category_name: "Food & Drinks",
      },
      {
        title: "London Jazz Evening",
        description: "Intimate jazz sets with guest sax.",
        location: "London",
        date_time: "2025-11-10 20:00:00",
        price: "£18",
        seats: 90,
        image_url:
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        category_name: "Music",
      },
      {
        title: "Manchester Photography Walk",
        description: "Golden-hour composition tips and street shots.",
        location: "Manchester",
        date_time: "2025-11-11 16:00:00",
        price: "Free",
        seats: 35,
        image_url:
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
        category_name: "Hobbies",
      },
      {
        title: "London Yoga at Hyde Park",
        description: "Sunset vinyasa—bring your mat.",
        location: "London",
        date_time: "2025-11-15 18:15:00",
        price: "£7",
        seats: 60,
        image_url:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
        category_name: "Hobbies",
      },
      {
        title: "Birmingham Business Meetup",
        description: "Roundtable for local founders and operators.",
        location: "Birmingham",
        date_time: "2025-11-16 19:00:00",
        price: "Free",
        seats: 80,
        image_url:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
        category_name: "Business",
      },
    ],
  },
  {
    adminEmail: "admin.sara@demo.local",
    events: [
      {
        title: "London Nightlife DJ Session",
        description: "House & disco classics, late-night set.",
        location: "London",
        date_time: "2025-11-08 22:00:00",
        price: "£10",
        seats: 200,
        image_url:
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
        category_name: "Nightlife",
      },
      {
        title: "Manchester Theatre Improv",
        description: "Laugh-out-loud improv with audience suggestions.",
        location: "Manchester",
        date_time: "2025-11-13 19:30:00",
        price: "£9",
        seats: 70,
        image_url:
          "https://images.unsplash.com/photo-1550534791-2677533605a1?w=800&q=80",
        category_name: "Performing & Visual Arts",
      },
      {
        title: "Birmingham Makers Market",
        description: "Handmade crafts and local goods.",
        location: "Birmingham",
        date_time: "2025-11-17 11:00:00",
        price: "Free",
        seats: 150,
        image_url:
          "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&q=80",
        category_name: "Hobbies",
      },
      {
        title: "London Book Club",
        description: "Discuss a contemporary novel with tea & biscuits.",
        location: "London",
        date_time: "2025-11-18 18:00:00",
        price: "Free",
        seats: 40,
        image_url:
          "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80",
        category_name: "Other",
      },
      {
        title: "Manchester Data Meetup",
        description: "Talks on SQL optimization and analytics.",
        location: "Manchester",
        date_time: "2025-11-20 18:30:00",
        price: "Free",
        seats: 120,
        image_url:
          "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
        category_name: "Business",
      },
    ],
  },
];

(async () => {
  try {
    // 1) Ensure categories exist
    await ensureCategories(CATS);

    for (const batch of eventBatches) {
      // 2) Resolve admin user id by email
      const userId = await getUserIdByEmail(batch.adminEmail);

      // 3) Insert/Upsert each event
      for (const ev of batch.events) {
        const category_id = await getCategoryIdByName(ev.category_name);
        await upsertEvent({
          ...ev,
          created_by: userId,
          category_id,
        });
        console.log(`Seeded: ${ev.title} (${batch.adminEmail})`);
      }
    }

    console.log("All events seeded/updated successfully.");
  } catch (e) {
    console.error("Seeding failed:", e);
    process.exit(1);
  }
})();
