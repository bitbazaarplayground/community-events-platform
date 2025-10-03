/// <reference types="https://deno.land/x/supabase@1.0.0/functions/runtime.d.ts" />

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Access-Control-Allow-Headers", "authorization, content-type");
  return new Response(res.body, { status: res.status, headers: h });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);

  // Query params
  const q = url.searchParams.get("q") || "";
  const location = url.searchParams.get("location") || "";
  const category = url.searchParams.get("category") || "";
  const countryCode = url.searchParams.get("countryCode") || "GB";
  const page = url.searchParams.get("page") || "0";

  const TM_KEY = Deno.env.get("TICKETMASTER_KEY");
  if (!TM_KEY) {
    return cors(new Response("Missing TICKETMASTER_KEY", { status: 500 }));
  }

  try {
    const params = new URLSearchParams({
      apikey: TM_KEY,
      countryCode,
      size: "12", // match UI page size
      page,
    });

    if (q) params.set("keyword", q);

    // Only add city if it looks like a valid city (not "UK")
    if (location && location.toLowerCase() !== "uk") {
      params.set("city", location);
    }

    if (category) params.set("classificationName", category);

    const requestUrl = `${TM_BASE}/events.json?${params.toString()}`;
    console.log("📡 TM request URL:", requestUrl);

    const r = await fetch(requestUrl);
    if (!r.ok) {
      const text = await r.text();
      console.error("❌ TM API error:", r.status, text);
      return cors(new Response(text, { status: r.status }));
    }

    const data = await r.json();
    console.log("✅ TM API response keys:", Object.keys(data));

    return cors(
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (e) {
    console.error("💥 Proxy error:", e);
    return cors(new Response(`Proxy error: ${e}`, { status: 500 }));
  }
});
