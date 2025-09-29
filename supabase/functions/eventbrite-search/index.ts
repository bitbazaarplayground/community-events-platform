// supabase/functions/eventbrite-search/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EB_BASE = "https://www.eventbriteapi.com/v3";

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
  const q = url.searchParams.get("q") ?? ""; // free text search
  const id = url.searchParams.get("id"); // exact event id
  const expand = "organizer,venue,category,format,subcategory"; // richer data

  const EB_TOKEN = Deno.env.get("EVENTBRITE_TOKEN");
  if (!EB_TOKEN) {
    return cors(new Response("Missing EVENTBRITE_TOKEN", { status: 500 }));
  }

  const headers = { Authorization: `Bearer ${EB_TOKEN}` };

  try {
    if (id) {
      // Single event by ID
      const r = await fetch(`${EB_BASE}/events/${id}/?expand=${expand}`, {
        headers,
      });
      if (!r.ok) {
        return cors(new Response(await r.text(), { status: r.status }));
      }
      const event = await r.json();
      return cors(
        new Response(JSON.stringify(event), {
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Search events (public)
    const params = new URLSearchParams({
      q,
      expand: expand,
      sort_by: "date",
      include_all_series_instances: "yes",
    });

    const r = await fetch(`${EB_BASE}/events/search/?${params.toString()}`, {
      headers,
    });
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
