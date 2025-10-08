// --- Normalizer: cleans and unifies Ticketmaster event data ---
function normalizeTicketmaster(ev) {
  const id = `tm_${ev.id}`;
  const title = ev.name || "Untitled";
  const date_time = ev.dates?.start?.dateTime || null;

  // 📍 Location
  const venue = ev._embedded?.venues?.[0];
  const locationParts = [];
  if (venue?.name) locationParts.push(venue.name);
  if (venue?.city?.name) locationParts.push(venue.city.name);
  const location = locationParts.join(", ");

  // 🖼 Description & image
  const description = ev.info || ev.pleaseNote || "";
  let image_url = null;
  if (Array.isArray(ev.images) && ev.images.length > 0) {
    const preferred = ev.images.find((img) => img.width >= 400);
    image_url = preferred?.url || ev.images[0].url;
  }
  if (!image_url) image_url = "/images/placeholder-event.jpg";

  // 🏷 Category
  const category = ev.classifications?.[0]?.segment?.name || null;

  // 💰 Price
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

// --- Cache & throttle maps ---
const cache = new Map(); // key -> { data, timestamp }
const lastFetchByKey = new Map(); // key -> last timestamp

// --- Main search function ---
export async function searchTicketmaster(filters = {}, page = 0) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const cacheKey = JSON.stringify({ filters, page });
  const throttleKey = JSON.stringify({ filters, page: 0 });
  const now = Date.now();

  // 🧠 Throttle identical searches (page 0 only)
  const last = lastFetchByKey.get(throttleKey) || 0;
  if (page === 0 && now - last < 1200) {
    const cachedHit =
      cache.get(cacheKey) || cache.get(JSON.stringify({ filters, page: 0 }));
    if (cachedHit) return cachedHit.data;
  }
  if (page === 0) lastFetchByKey.set(throttleKey, now);

  // Store in local cache for 20 minutes
  const TWENTY_MINUTES = 20 * 60 * 1000;
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < TWENTY_MINUTES) {
    console.log("💾 Using cached Ticketmaster data for:", filters);
    return cached.data;
  }

  // 🧭 Build URL
  const url = new URL(`${base}/functions/v1/tm-search`);
  url.searchParams.set("countryCode", "GB");
  url.searchParams.set("page", String(page));

  if (filters.q) url.searchParams.set("q", filters.q);
  if (filters.location) url.searchParams.set("location", filters.location);
  if (
    filters.category &&
    filters.category.toLowerCase() !== "other" &&
    filters.category.trim() !== ""
  ) {
    url.searchParams.set("segmentId", filters.category);
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${anon}` },
    });
  } catch (err) {
    if (cached) return cached.data;
    console.error("❌ Ticketmaster network error:", err);
    throw new Error("Ticketmaster network error");
  }

  if (res.status === 429) {
    console.warn("⚠️ Ticketmaster rate-limited (429)");
    if (cached) return cached.data;
    throw new Error("Ticketmaster temporarily unavailable (429)");
  }

  if (!res.ok) {
    if (cached) return cached.data;
    throw new Error(`Ticketmaster search failed: ${res.statusText}`);
  }

  const data = await res.json();
  const events = data._embedded?.events ?? [];

  // Fallback to cache if API returned nothing
  if (events.length === 0 && cached) {
    console.warn("⚙️ Using cached Ticketmaster data after empty fetch");
    return cached.data;
  }

  // Format the response
  const formatted = {
    events: events.map(normalizeTicketmaster),
    hasMore: data.page?.number < (data.page?.totalPages ?? 0) - 1,
    nextPage: (data.page?.number ?? 0) + 1,
  };

  cache.set(cacheKey, { data: formatted, timestamp: now });
  return formatted;
}

// --- (Optional) Log Ticketmaster categories (dev only) ---
export async function logTicketmasterCategories() {
  if (import.meta.env.MODE !== "development") return;

  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_KEY;
    if (!apiKey) {
      console.warn("⚠️ No Ticketmaster API key found in .env");
      return;
    }

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/classifications.json?apikey=${apiKey}`
    );
    const data = await res.json();
    const classifications = data._embedded?.classifications || [];

    // 🎟 Log unique segments
    const segments = [
      ...new Set(classifications.map((c) => c.segment?.name).filter(Boolean)),
    ];
    console.log("🎟️ Ticketmaster Segments:", segments);

    // 📚 Log segments + genres
    const structured = {};
    classifications.forEach((c) => {
      const seg = c.segment?.name;
      const genres = c.segment?._embedded?.genres?.map((g) => g.name) || [];
      if (seg) {
        structured[seg] = Array.from(
          new Set([...(structured[seg] || []), ...genres])
        );
      }
    });
    console.log("📚 Ticketmaster Segments + Genres:", structured);
  } catch (err) {
    console.error("❌ Failed to load Ticketmaster categories:", err);
  }
}
