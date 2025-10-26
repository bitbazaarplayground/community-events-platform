import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { searchTicketmaster } from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

const cityImages = {
  london: "/img/London.png",
  manchester: "/img/Manchester.jpg",
  liverpool: "/img/Liverpool.jpg",
  glasgow: "/img/Glasgow.jpg",
  birmingham: "/img/Birmingham.jpg",
  edinburgh: "/img/edinburgh.webp",
};

const FALLBACK_IMG = "https://placehold.co/600x360?text=Event";

// Normalize and dedupe logic
const normalizeText = (str = "") =>
  str
    .toLowerCase()
    .trim()
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/gi, "")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/&\s*\d{1,2}(:\d{2})?/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function mapTicketmasterToCard(e) {
  const date_time = e.date_time || e.date || e.dates?.start?.dateTime || null;

  const image_url =
    e.image_url ||
    (Array.isArray(e.images) && e.images[0]?.url) ||
    FALLBACK_IMG;

  const location =
    e.location ||
    [e._embedded?.venues?.[0]?.name, e._embedded?.venues?.[0]?.city?.name]
      .filter(Boolean)
      .join(", ");

  const title = e.title || e.name || "Untitled";

  return {
    id: e.id && String(e.id).startsWith("tm_") ? e.id : `tm_${e.id}`,
    title,
    date_time,
    date: date_time,
    price: null,
    is_paid: true,
    location,
    description: e.description || e.info || e.pleaseNote || "",
    category: e.category || e.classifications?.[0]?.segment?.name || null,
    seats_left: null,
    image_url,
    created_by: null,
    external_source: "ticketmaster",
    external_url: e.external_url || e.url || null,
    external_organizer:
      e.external_organizer ||
      e.promoter?.name ||
      (Array.isArray(e.promoters) && e.promoters[0]?.name) ||
      (Array.isArray(e._embedded?.attractions) &&
        e._embedded.attractions[0]?.name) ||
      "Ticketmaster",
  };
}

function dedupeTicketmaster(tmEvents) {
  const grouped = {};

  for (const ev of tmEvents) {
    const titleNorm = normalizeText(ev.title);
    const venueRaw =
      ev.location?.split(",")[0] ||
      ev._embedded?.venues?.[0]?.name ||
      ev._embedded?.venues?.[0]?.city?.name ||
      "";
    const venueNorm = normalizeText(venueRaw) || "unknown";
    const key = `${titleNorm}::${venueNorm}`;

    const dateIso = ev.date_time || ev.date || null;
    const dateVal = dateIso ? new Date(dateIso) : null;

    if (!grouped[key]) {
      grouped[key] = { ...ev, extraDates: [] };
    } else if (dateVal) {
      grouped[key].extraDates.push(dateIso);
      const currentMain = grouped[key].date_time
        ? new Date(grouped[key].date_time)
        : null;
      if (!currentMain || dateVal < currentMain) {
        grouped[key].date_time = dateIso;
        grouped[key].date = dateIso;
      }
    }
  }

  return Object.values(grouped).map((ev) => {
    const uniqueExtras = Array.from(new Set(ev.extraDates))
      .filter((d) => d && d !== ev.date_time)
      .sort((a, b) => new Date(a) - new Date(b));

    return {
      ...ev,
      extraDates: uniqueExtras,
      extraCount: uniqueExtras.length,
    };
  });
}

export default function CityEvents() {
  const { cityName } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tmPage, setTmPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const cityKey = cityName.toLowerCase();
  const cityTitle = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
  const cityImage =
    cityImages[cityKey] || "https://placehold.co/1200x500?text=City+Events";

  async function fetchEvents(reset = false) {
    if (reset) {
      setLoading(true);
      setTmPage(0);
    }

    try {
      const currentPage = reset ? 0 : tmPage;

      // Fetch local DB events only once
      const { data: dbEvents } =
        reset && currentPage === 0
          ? await supabase
              .from("events")
              .select("*")
              .ilike("location", `%${cityKey}%`)
          : { data: [] };

      // Ticketmaster paginated fetch
      const tmData = await searchTicketmaster(
        { location: cityKey },
        currentPage
      );
      const tmRaw = tmData?.events || [];
      const tmMapped = tmRaw.map(mapTicketmasterToCard);
      const tmGrouped = dedupeTicketmaster(tmMapped);

      setHasMore(tmData.hasMore);
      setTmPage(tmData.nextPage || 0);

      const combined = reset
        ? [...(dbEvents || []), ...tmGrouped]
        : [...events, ...tmGrouped];

      // sort by earliest date
      combined.sort((a, b) => {
        const da =
          a.date || a.date_time
            ? new Date(a.date || a.date_time).getTime()
            : Infinity;
        const db =
          b.date || b.date_time
            ? new Date(b.date || b.date_time).getTime()
            : Infinity;
        return da - db;
      });

      setEvents(combined);
    } catch (err) {
      console.error("Error fetching city events:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents(true);
  }, [cityKey]);

  return (
    <section className="min-h-screen bg-gray-50 pb-20">
      {/* City Banner */}
      <div
        className="relative h-72 md:h-96 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${cityImage})` }}
      >
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Discover {cityTitle}
          </h1>
          <p className="text-gray-200 text-lg">
            Explore top events happening across {cityTitle}
          </p>
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        {loading && events.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            No upcoming events found in {cityTitle}.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>

            {/* “See more” button */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => fetchEvents(false)}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-60"
                >
                  {loading ? "Loading…" : "See more events"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
