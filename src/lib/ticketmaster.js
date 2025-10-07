// src/lib/ticketmaster.js

/** ================================
 * Normalize Ticketmaster’s event shape
 * ================================ */
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
  if (!image_url) image_url = "/images/placeholder-event.jpg";

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
    external_organizer:
      ev.promoter?.name ||
      (Array.isArray(ev.promoters) && ev.promoters.length
        ? ev.promoters[0]?.name
        : null) ||
      ev._embedded?.attractions?.[0]?.name ||
      "Ticketmaster Official",
  };
}

/** ================================
 * Ticketmaster Fetch with Caching + Throttling
 * ================================ */
const cache = new Map(); // key → { data, timestamp }
let lastFetchTime = 0;

export async function searchTicketmaster(filters = {}, page = 0) {
  const now = Date.now();
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Prevent hammering
  if (now - lastFetchTime < 10000) {
    console.warn("🕒 Throttling Ticketmaster requests");
    return { events: [], hasMore: false, nextPage: page };
  }
  lastFetchTime = now;

  // Cache key (include filters + page)
  const cacheKey = JSON.stringify({ filters, page });
  const cached = cache.get(cacheKey);
  const TWENTY_MINUTES = 20 * 60 * 1000;

  // If cache is valid
  if (cached && now - cached.timestamp < TWENTY_MINUTES) {
    console.log("💾 Using cached Ticketmaster data");
    return cached.data;
  }

  // Build request
  const url = new URL(`${base}/functions/v1/tm-search`);
  url.searchParams.set("countryCode", "GB");
  url.searchParams.set("page", String(page));
  if (filters.q) url.searchParams.set("q", filters.q);
  if (filters.location) url.searchParams.set("location", filters.location);
  if (filters.category) url.searchParams.set("category", filters.category);

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${anon}` },
    });
  } catch (err) {
    console.error("❌ Network error:", err);
    if (cached) {
      console.warn("⚙️ Returning cached data after network error");
      return cached.data;
    }
    throw new Error("Ticketmaster network error");
  }

  // Handle rate-limit or errors
  if (res.status === 429) {
    console.warn("⚠️ Ticketmaster rate-limited (429)");
    if (cached) {
      console.log("💾 Returning cached Ticketmaster data");
      return cached.data;
    }
    throw new Error("Ticketmaster temporarily unavailable (429)");
  }

  if (!res.ok) {
    throw new Error(`Ticketmaster search failed: ${res.statusText}`);
  }

  const data = await res.json();
  const events = data._embedded?.events ?? [];
  const formatted = {
    events: events.map(normalizeTicketmaster),
    hasMore: data.page?.number < (data.page?.totalPages ?? 0) - 1,
    nextPage: (data.page?.number ?? 0) + 1,
  };

  // Store in cache
  cache.set(cacheKey, { data: formatted, timestamp: now });
  console.log(`✅ Cached Ticketmaster results (${cache.size} keys total)`);

  return formatted;
}
