// src/lib/ticketmaster.js

/** Normalize Ticketmaster’s event shape to your EventCard props */
function normalizeTicketmaster(ev) {
  const id = `tm_${ev.id}`;
  const title = ev.name || "Untitled";
  const date_time = ev.dates?.start?.dateTime || null;

  const venue = ev._embedded?.venues?.[0];
  const locationParts = [];
  if (venue?.name) locationParts.push(venue.name);
  if (venue?.city?.name) locationParts.push(venue.city.name);
  const location = locationParts.join(", ");

  const description = ev.info || ev.pleaseNote || "";
  let image_url = null;
  if (Array.isArray(ev.images) && ev.images.length > 0) {
    const preferred = ev.images.find((img) => img.width >= 400);
    image_url = preferred?.url || ev.images[0].url;
  }
  if (!image_url) {
    image_url = "/images/placeholder-event.jpg";
  }

  const category = ev.classifications?.[0]?.segment?.name || null;

  let price = "Paid";
  if (ev.priceRanges?.[0]) {
    const pr = ev.priceRanges[0];
    price = `${pr.min}–${pr.max} ${pr.currency}`;
  }

  return {
    id,
    title,
    date_time,
    price,
    location,
    description,
    image_url,
    seats_left: null,
    creatorId: null,
    category,
    external_source: "ticketmaster",
    external_url: ev.url || null,
    external_organizer: ev.promoter?.name || "Ticketmaster",
  };
}

/**
 * Search Ticketmaster events via your Supabase Edge Function.
 *
 * @param {Object} filters   { q?: string, location?: string, category?: string }
 * @param {number} page      Zero-based page number
 * @returns {Promise<{events: any[], hasMore: boolean, nextPage: number}>}
 */
export async function searchTicketmaster(filters = {}, page = 0) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = new URL(`${base}/functions/v1/tm-search`);
  url.searchParams.set("countryCode", "GB");
  url.searchParams.set("page", String(page));

  if (filters.q) url.searchParams.set("q", filters.q);
  if (filters.location) url.searchParams.set("location", filters.location);
  if (filters.category) url.searchParams.set("category", filters.category);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${anon}` },
  });

  if (!res.ok) {
    throw new Error(`Ticketmaster search failed: ${res.statusText}`);
  }

  const data = await res.json();

  const events = data._embedded?.events ?? [];

  return {
    events: events.map(normalizeTicketmaster),
    hasMore: data.page?.number < (data.page?.totalPages ?? 0) - 1,
    nextPage: (data.page?.number ?? 0) + 1,
  };
}
