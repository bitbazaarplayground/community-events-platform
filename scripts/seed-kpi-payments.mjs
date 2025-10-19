// scripts/seed-kpi-payments.mjs
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_UID = "e06347e9-3e8b-4c2f-97f6-7c96cbfb7006";
const ADMIN_EMAIL = "bitbazaarplayground@gmail.com";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("🚀 KPI Payments Seeder Started");

  // 1️⃣ Get admin events
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, title, price, created_by")
    .eq("created_by", ADMIN_UID);

  if (evErr) throw new Error(evErr.message);
  if (!events.length) {
    console.log("❌ No events found for admin, run event seed first.");
    return;
  }
  console.log(`📦 Found ${events.length} admin events.`);

  // 2️⃣ 10 test users (reuse if exist)
  const fakeUsers = Array.from({ length: 10 }, (_, i) => ({
    email: `kpi_user_${i + 1}@example.com`,
    full_name: `KPI User ${i + 1}`,
    role: "user",
    created_at: new Date().toISOString(),
  }));
  await supabase
    .from("user_profiles")
    .upsert(fakeUsers, { onConflict: "email" });

  // 3️⃣ Payment patterns per event (varied)
  const eventPatterns = {
    0: [0, 1],
    1: Array.from({ length: 10 }, (_, i) => i),
    2: [0, 1, 2, 3],
    3: [2, 3, 4],
    4: [4, 5, 6, 7, 8, 9],
  };

  const payments = [];

  for (const [index, userIndexes] of Object.entries(eventPatterns)) {
    const event = events[index];
    if (!event) continue;

    userIndexes.forEach((i) => {
      const email = `kpi_user_${i + 1}@example.com`;
      const qty = Math.random() > 0.8 ? 2 : 1; // occasionally buy 2 tickets
      const amount = event.price * qty;
      const created_at = new Date(
        Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000
      ).toISOString(); // past 10 days

      payments.push({
        event_id: event.id,
        event_title: event.title,
        user_email: email,
        amount,
        quantity: qty,
        status: "paid",
        created_at,
      });
    });
  }

  // 4️⃣ Insert into payments table
  const { data, error } = await supabase
    .from("payments")
    .insert(payments)
    .select();
  if (error) throw new Error("Insert failed: " + error.message);

  console.log(`💸 Inserted ${data.length} payments`);
  console.log("🎯 KPI dashboard data ready!");
}

main().catch((err) => console.error("❌ Seed failed:", err.message));
