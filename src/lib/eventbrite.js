// src/lib/eventbrite.js

/** Extract EB event id from a URL or raw id */
export function extractEventbriteId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^\d+$/.test(trimmed)) return trimmed; // already an ID

  try {
    const u = new URL(trimmed);
    // matches .../<slug>-1234567890 or .../events/1234567890/
    const m = u.pathname.match(/-(\d+)$|\/events\/(\d+)(?:\/|$)/);
    return m?.[1] || m?.[2] || null;
  } catch {
    return null;
  }
}

/** Call your Supabase Edge Function: eventbrite-search?q=... */
export async function searchEventbrite(term) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${base}/functions/v1/eventbrite-search?q=${encodeURIComponent(
    term
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${anon}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.events ?? []; // Eventbrite wraps results
}

/** Call your Supabase Edge Function: eventbrite-search?id=... */
export async function getEventbriteById(id) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${base}/functions/v1/eventbrite-search?id=${encodeURIComponent(
    id
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${anon}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json(); // single event object
}
