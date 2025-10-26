// netlify/functions/seed-events.js
// Schedules: every 5 days at 09:00 UTC
export const config = { schedule: "0 9 */5 * *" };

import { EVENT_TEMPLATES } from "../data/eventTemplates.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_UID = "e3e9a740-c7ea-4164-906b-e2feec1bbc0e";

// Utility: build an ISO date-time in UTC from either offsetDays or fixedDate (MM-DD)
function resolveFutureDate({ offsetDays, fixedDate, time = "19:00" }) {
  const [hh = "19", mm = "00"] = (time || "19:00").split(":");

  if (offsetDays != null) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(offsetDays));
    d.setUTCHours(Number(hh), Number(mm), 0, 0);
    return d.toISOString();
  }

  if (fixedDate) {
    const [MM, DD] = fixedDate.split("-").map((s) => Number(s));
    const now = new Date();
    const year =
      now.getUTCMonth() + 1 > MM ||
      (now.getUTCMonth() + 1 === MM && now.getUTCDate() > DD)
        ? now.getUTCFullYear() + 1
        : now.getUTCFullYear();

    const d = new Date(
      Date.UTC(year, MM - 1, DD, Number(hh), Number(mm), 0, 0)
    );
    return d.toISOString();
  }

  // fallback: +10 days at 19:00
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 10);
  d.setUTCHours(Number(hh), Number(mm), 0, 0);
  return d.toISOString();
}

// Basic de-dupe: check if (title + date) exists already
async function eventExists({ title, date }) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/events`);
  url.searchParams.set("select", "id");
  url.searchParams.set("title", `eq.${title}`);
  url.searchParams.set("date", `eq.${date}`);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) return false; // if read fails, allow insert (won't break keep-alive)
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function insertEvent(evt) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(evt),
  });
  return res.ok;
}

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: "Missing SUPABASE env vars. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const nowISO = new Date().toISOString();

  // Build future events from templates
  const payloads = EVENT_TEMPLATES.map((tpl) => {
    const dateISO = resolveFutureDate({
      offsetDays: tpl.offsetDays,
      fixedDate: tpl.fixedDate, // optional MM-DD
      time: tpl.time,
    });

    return {
      title: tpl.title,
      description: tpl.description || "Auto-seeded keep-alive event.",
      category: tpl.category || "Other",
      location: tpl.location || tpl.city || "United Kingdom",
      city: tpl.city || null, // if you have this column
      price: Number(tpl.price ?? 0),
      is_paid: tpl.is_paid ?? Number(tpl.price ?? 0) > 0,
      date: dateISO,
      image_url: tpl.image_url || "https://placehold.co/600x360?text=Event",
      created_by: ADMIN_UID, // your Admin UID
      seats_left: tpl.seats_left ?? 50,
      external_source: null, // local event
      external_url: null,
    };
  })
    // only future (strictly > now)
    .filter((e) => e.date > nowISO);

  let inserted = 0;
  for (const evt of payloads) {
    try {
      const exists = await eventExists({ title: evt.title, date: evt.date });
      if (!exists) {
        const ok = await insertEvent(evt);
        if (ok) inserted++;
      }
    } catch {}
  }

  return {
    statusCode: 200,
    body: `Seed completed. Inserted ${inserted} future event(s).`,
  };
}
