// @ts-nocheck
/// <reference types="https://deno.land/x/supabase@1.0.0/functions/runtime.d.ts" />

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes
const cache = new Map<string, { timestamp: number; data: any }>();

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Access-Control-Allow-Headers", "authorization, content-type");
  return new Response(res.body, { status: res.status, headers: h });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const location = url.searchParams.get("location") || "";
  const segmentId = url.searchParams.get("segmentId") || "";
  const countryCode = url.searchParams.get("countryCode") || "GB";
  const page = url.searchParams.get("page") || "0";

  const TM_KEY = Deno.env.get("TICKETMASTER_KEY");
  if (!TM_KEY) {
    console.error("❌ Missing TICKETMASTER_KEY");
    return cors(new Response("Missing TICKETMASTER_KEY", { status: 500 }));
  }

  // === Cache Key ===
  const cacheKey = JSON.stringify({
    q,
    location,
    segmentId,
    countryCode,
    page,
  });
  const now = Date.now();

  // Serve from cache if fresh
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log("💾 Served Ticketmaster data from cache");
    return cors(
      new Response(JSON.stringify(cached.data), {
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // === Build query ===
  const params = new URLSearchParams({
    apikey: TM_KEY,
    countryCode,
    size: "30",
    page,
    sort: q ? "date,asc" : "relevance,desc",
  });

  if (q) params.set("keyword", q);
  if (location && location.toLowerCase() !== "uk") params.set("city", location);
  if (segmentId) params.set("segmentId", segmentId);

  // Add date range (today → +30 days)
  function formatTMDate(date: Date) {
    return date.toISOString().split(".")[0] + "Z";
  }

  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  params.set("startDateTime", formatTMDate(startDate));
  params.set("endDateTime", formatTMDate(endDate));

  const requestUrl = `${TM_BASE}/events.json?${params.toString()}`;
  console.log("📡 Ticketmaster request:", requestUrl);

  // === Fetch data ===
  let response;
  try {
    response = await fetch(requestUrl);
  } catch (err) {
    console.error("💥 Fetch error:", err);
    return cors(new Response(`Fetch error: ${err}`, { status: 500 }));
  }

  // Retry on rate-limit
  if (response.status === 429 || response.status === 503) {
    console.warn(
      `⚠️ Rate-limited (${response.status}) — retrying smaller batch`
    );
    await sleep(1000);
    params.set("size", "20");
    response = await fetch(`${TM_BASE}/events.json?${params.toString()}`);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ TM API error:", response.status, text);
    return cors(
      new Response(
        JSON.stringify({
          error: "Ticketmaster API returned error",
          status: response.status,
          details: text,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );
  }

  const data = await response.json();
  const events = data._embedded?.events ?? [];

  // === Deduplicate ===
  const seen = new Set<string>();
  const uniqueEvents = events.filter((ev: any) => {
    const title = (ev?.name || "").toLowerCase().trim();
    const venue = ev?._embedded?.venues?.[0]?.name?.toLowerCase().trim() || "";
    const key = `${title}::${venue}`;
    if (!title) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const cleanedData = {
    ...data,
    _embedded: { ...data._embedded, events: uniqueEvents },
  };

  cache.set(cacheKey, { timestamp: now, data: cleanedData });
  console.log(`✅ Cached TM response (${uniqueEvents.length} events)`);

  return cors(
    new Response(JSON.stringify(cleanedData), {
      headers: { "Content-Type": "application/json" },
    })
  );
});
