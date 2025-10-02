// supabase/functions/tm-search/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Access-Control-Allow-Headers", "authorization, content-type");
  return new Response(res.body, { status: res.status, headers: h });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);

  // query params
  const q = url.searchParams.get("q") || ""; // only pass keyword if explicitly provided
  const location = url.searchParams.get("location") || ""; // city filter (optional)
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
    console.error("TM request:", `${TM_BASE}/events.json?${params.toString()}`);
    console.log("TM request:", `${TM_BASE}/events.json?${params.toString()}`);

    const r = await fetch(`${TM_BASE}/events.json?${params.toString()}`);
    if (!r.ok) {
      return cors(new Response(await r.text(), { status: r.status }));
    }
    const data = await r.json();

    return cors(
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (e) {
    return cors(new Response(`Proxy error: ${e}`, { status: 500 }));
  }
});
