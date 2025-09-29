import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: find a user by email (iterate pages to be safe)
async function findUserByEmail(email, perPage = 100, maxPages = 10) {
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < perPage) break; // no more pages
  }
  return null;
}

// Helper: ensure an auth user exists, return the user object
async function ensureAuthUser(email, password) {
  // Try to create
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data?.user) {
    return data.user;
  }

  // If creation failed because it already exists, reuse existing
  // Supabase returns a 422 for "already registered"—but we just search to be robust.
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  // Otherwise bubble up the original error
  if (error) throw error;
  throw new Error(`Could not create or find user for ${email}`);
}

const admins = [
  {
    email: "admin.ava@demo.local",
    password: "P@ssw0rd-Ava-123",
    first_name: "Ava",
    last_name: "Admin",
    avatar_url: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    email: "admin.josh@demo.local",
    password: "P@ssw0rd-Josh-123",
    first_name: "Josh",
    last_name: "Admin",
    avatar_url: "https://randomuser.me/api/portraits/men/31.jpg",
  },
  {
    email: "admin.sara@demo.local",
    password: "P@ssw0rd-Sara-123",
    first_name: "Sara",
    last_name: "Admin",
    avatar_url: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    email: "admin.james@demo.local",
    password: "P@ssw0rd-James-123",
    first_name: "James",
    last_name: "Admin",
    avatar_url: "https://randomuser.me/api/portraits/men/28.jpg",
  },
];

(async () => {
  try {
    for (const a of admins) {
      const user = await ensureAuthUser(a.email, a.password);

      // Idempotent profile upsert keyed by id
      const { error: upsertErr } = await admin.from("user_profiles").upsert(
        {
          id: user.id,
          email: a.email,
          role: "admin",
          first_name: a.first_name,
          last_name: a.last_name,
          avatar_url: a.avatar_url,
          allow_email: true,
          allow_sms: false,
          allow_push: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (upsertErr) throw upsertErr;

      console.log("Ready:", a.email, user.id);
    }

    console.log("All admins created/updated.");
  } catch (e) {
    console.error("Seed failed:", e);
    process.exit(1);
  }
})();
