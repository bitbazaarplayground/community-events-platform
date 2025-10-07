// src/pages/Browse.jsx
import { useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchbar.jsx";
import { searchTicketmaster } from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

// 🔑 Mapping between local categories and Ticketmaster's categories
const CATEGORY_MAP = {
  Music: "Music",
  Nightlife: "Music",
  "Performing & Visual Arts": "Arts & Theatre",
  "Food & Drinks": "Food",
  Hobbies: "Miscellaneous",
  Business: "Miscellaneous",
  Sports: "Sports",
  Other: "",
};

export default function Browse() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [filters, setFilters] = useState({});
  const [tmPage, setTmPage] = useState(0);
  const [tmHasMore, setTmHasMore] = useState(false);

  const PAGE_SIZE = 12;

  const fetchEvents = async (newFilters = {}, reset = false) => {
    const applied = reset ? newFilters : filters;
    setFilters(applied);

    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // === 1️⃣ Local events from Supabase ===
      let q = supabase
        .from("events")
        .select("*, categories(name)")
        .order("date_time", { ascending: true })
        .range(from, to);

      if (applied.event) q = q.ilike("title", `%${applied.event}%`);
      if (applied.location) q = q.ilike("location", `%${applied.location}%`);
      if (applied.category) q = q.eq("category_id", applied.category);

      const localRes = await q;
      if (localRes.error) {
        console.error("❌ Supabase error:", localRes.error.message);
      }

      const localData = localRes.data || [];
      const local = localData.map((row) => ({
        id: row.id,
        title: row.title,
        date_time: row.date_time,
        price: row.price,
        location: row.location,
        description: row.description,
        image_url: row.image_url,
        seats_left: row.seats_left,
        creatorId: row.created_by,
        category: row.categories?.name || null,
        external_source: null,
        external_url: null,
        external_organizer: null,
      }));

      // === 2️⃣ Ticketmaster events ===
      const tmCategory =
        CATEGORY_MAP[applied.categoryLabel] ?? applied.categoryLabel ?? "";
      const tmRes = await searchTicketmaster(
        {
          q: applied.event || "",
          location: applied.location || "",
          category: tmCategory,
        },
        reset ? 0 : tmPage
      );

      let ticketmaster = tmRes.events || [];

      // === 3️Remove duplicate Ticketmaster events ===

      const isSearching = Boolean(applied.event && applied.event.trim());
      const normalizeText = (str = "") =>
        str
          .toLowerCase()
          .trim()
          // remove day/time words in titles
          .replace(/\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/gi, "")
          .replace(/\b\d{1,2}:\d{2}\b/g, "")
          .replace(/&\s*\d{1,2}(:\d{2})?/g, "")
          // strip other fluff
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      if (!isSearching) {
        const grouped = {};

        for (const ev of ticketmaster) {
          const title = normalizeText(ev.title);
          const venue =
            normalizeText(
              ev.location?.split(",")[0] ||
                ev._embedded?.venues?.[0]?.name ||
                ev._embedded?.venues?.[0]?.city?.name ||
                ""
            ) || "unknown";

          const key = `${title}::${venue}`;
          const date = new Date(ev.date_time);

          // Keep the earliest upcoming event for this base title+venue
          if (!grouped[key] || date < new Date(grouped[key].date_time)) {
            grouped[key] = ev;
          }
        }

        ticketmaster = Object.values(grouped);
      }

      console.log(
        "🎭 After dedupe:",
        ticketmaster.map((e) => ({
          title: e.title,
          venue: e.location,
          date: e.date_time,
        }))
      );

      // === 4️⃣ Merge local + Ticketmaster ===
      let combined = [...local, ...ticketmaster];

      // Randomize the entire list only when browsing (not searching)
      if (!isSearching) {
        combined = combined.sort(() => Math.random() - 0.5);
      }

      // === 5️⃣ Randomly interleave local + Ticketmaster events ===
      const localEvents = combined.filter((e) => !e.external_source);
      const tmEvents = combined.filter(
        (e) => e.external_source === "ticketmaster"
      );

      const interleaved = [];
      while (localEvents.length || tmEvents.length) {
        // Randomly pick between local/TM (prefer alternating)
        const useLocal =
          Math.random() < 0.5
            ? localEvents.length > 0
            : tmEvents.length === 0
            ? true
            : false;

        if (useLocal && localEvents.length) {
          interleaved.push(localEvents.pop());
        } else if (tmEvents.length) {
          interleaved.push(tmEvents.pop());
        }
      }

      // === 6️⃣ Sort by upcoming date ===
      const sorted = interleaved.sort((a, b) => {
        const da = a.date_time ? new Date(a.date_time).getTime() : 0;
        const db = b.date_time ? new Date(b.date_time).getTime() : 0;
        return da - db;
      });

      // === 7️⃣ Save results ===
      if (reset) {
        setEvents(sorted);
        setPage(1);
        setTmPage(tmRes.nextPage || 0);
      } else {
        setEvents((prev) => [...prev, ...sorted]);
        setPage((prev) => prev + 1);
        setTmPage(tmRes.nextPage || tmPage);
      }

      setHasMoreLocal(localData.length === PAGE_SIZE);
      setTmHasMore(tmRes.hasMore);
    } catch (err) {
      console.error("fetchEvents failed:", err);
    }
  };

  useEffect(() => {
    fetchEvents({}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoadMore = useMemo(
    () => hasMoreLocal || tmHasMore,
    [hasMoreLocal, tmHasMore]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white py-30 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center translate-y-[-40%] relative z-10">
          <h2 className="text-lg font-semibold text-purple-200">
            Find Your Next Experience
          </h2>
          <h1 className="text-4xl md:text-5xl font-extrabold mt-2">
            Discover & Promote <br /> Upcoming Events
          </h1>
        </div>

        {/* Floating Search Bar */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[-90%] w-full max-w-4xl px-6 z-20">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 hover:shadow-xl transition">
            <FancySearchBar
              variant="browse"
              onSearch={(f) => {
                fetchEvents(f, true);
              }}
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-900">
          Featured Events
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Upcoming events you won’t want to miss
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.length === 0 ? (
            <p className="col-span-full text-center text-gray-600">
              No events available
            </p>
          ) : (
            events.map((ev) => (
              <EventCard
                key={`${ev.external_source || "local"}-${ev.id}`}
                id={ev.id}
                title={ev.title}
                date={ev.date_time}
                price={ev.price}
                location={ev.location}
                description={ev.description}
                category={ev.category}
                seats_left={ev.seats_left}
                image_url={ev.image_url}
                creatorId={ev.creatorId}
                external_source={ev.external_source}
                external_url={ev.external_url}
                external_organizer={ev.external_organizer}
              />
            ))
          )}
        </div>

        {canLoadMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => fetchEvents(filters)}
              className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition"
            >
              See More Events →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
