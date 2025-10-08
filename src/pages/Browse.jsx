import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchbar.jsx";
import {
  logTicketmasterCategories,
  searchTicketmaster,
} from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

// 🗂 Map between your site’s categories and Ticketmaster segments
const TM_SEGMENT_MAP = {
  Music: "KZFzniwnSyZfZ7v7nJ", // Music
  "Arts & Theatre": "KZFzniwnSyZfZ7v7na", // Arts & Theatre
  Sports: "KZFzniwnSyZfZ7v7nE", // Sports
  "Film & Cinema": "KZFzniwnSyZfZ7v7nn", // Film
  "Family & Kids": "KZFzniwnSyZfZ7v7n1", // Family
  "Festivals & Lifestyle": "KZFzniwnSyZfZ7v7nn", // Misc/Festivals
  Other: "",
};

export default function Browse() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [filters, setFilters] = useState({});
  const [tmPage, setTmPage] = useState(0);
  const [tmHasMore, setTmHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 12;

  useEffect(() => {
    logTicketmasterCategories();
  }, []);

  const fetchEvents = async (newFilters = {}, reset = false) => {
    if (loading) return;
    setLoading(true);

    const applied = reset ? newFilters : filters;

    // 🔧 FIX: Ensure categoryLabel is populated if only category ID is present
    if (applied.category && !applied.categoryLabel) {
      const { data: cat, error } = await supabase
        .from("categories")
        .select("name")
        .eq("id", applied.category)
        .maybeSingle();
      if (!error && cat?.name) {
        applied.categoryLabel = cat.name;
      }
    }

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
        applied?.categoryLabel && TM_SEGMENT_MAP[applied.categoryLabel]
          ? TM_SEGMENT_MAP[applied.categoryLabel]
          : "";

      console.log(
        "🎫 Using Ticketmaster category:",
        applied.categoryLabel,
        "→",
        tmCategory
      );

      const tmRes = await searchTicketmaster(
        {
          q: applied.event || "",
          location: applied.location || "",
          category: tmCategory,
        },
        reset ? 0 : tmPage
      );

      let ticketmaster = tmRes.events || [];

      /// === 3️⃣ Dedupe Ticketmaster events ===
      const hasKeyword = Boolean(applied.event?.trim());
      const hasAnyFilter =
        hasKeyword ||
        Boolean(applied.location?.trim()) ||
        Boolean(applied.categoryLabel?.trim());

      // Normalize helper: strips times, punctuation, etc.
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

      // ✅ Only dedupe if browsing by category/location (not keyword)
      if (!hasKeyword) {
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

          if (!grouped[key]) {
            grouped[key] = { ...ev, extraDates: [] };
          } else {
            grouped[key].extraDates.push(date);
            // Always keep the earliest date
            const currentDate = new Date(grouped[key].date_time);
            if (date < currentDate) grouped[key].date_time = ev.date_time;
          }
        }

        // Add total count for UI display (“+X more dates available”)
        ticketmaster = Object.values(grouped).map((ev) => ({
          ...ev,
          extraCount: ev.extraDates.length,
        }));
      }

      // === 4️⃣ Combine both sources ===
      let combined = [...local, ...ticketmaster];

      // === 5️⃣ Sort or shuffle depending on filters ===
      if (!hasAnyFilter && reset) {
        combined = combined.sort(() => Math.random() - 0.5);
      } else {
        combined = combined.sort((a, b) => {
          const da = a.date_time ? new Date(a.date_time).getTime() : 0;
          const db = b.date_time ? new Date(b.date_time).getTime() : 0;
          return da - db;
        });
      }

      // === 6️⃣ Interleave local + Ticketmaster events ===
      const localEvents = combined.filter((e) => !e.external_source);
      const tmEvents = combined.filter(
        (e) => e.external_source === "ticketmaster"
      );

      const interleaved = [];
      while (localEvents.length || tmEvents.length) {
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

      // ✅ Log how many events were fetched
      console.info(
        `✅ Loaded ${local.length} local + ${
          ticketmaster.length
        } TM events (combined: ${local.length + ticketmaster.length})`
      );

      // === 7️⃣ Save results ===
      if (reset) {
        setEvents(interleaved);
        setPage(1);
        setTmPage(tmRes.nextPage || 0);
      } else {
        setEvents((prev) => [...prev, ...interleaved]);
        setPage((prev) => prev + 1);
        setTmPage(tmRes.nextPage || tmPage);
      }
      // ✅ Only update pagination flags when not currently loading new results
      setHasMoreLocal((prev) =>
        reset
          ? localData.length === PAGE_SIZE
          : prev && localData.length === PAGE_SIZE
      );

      setTmHasMore((prev) => (reset ? tmRes.hasMore : prev || tmRes.hasMore));
      console.info(
        `✅ Loaded ${local.length} local + ${
          ticketmaster.length
        } TM events (combined: ${local.length + ticketmaster.length})`
      );
    } catch (err) {
      console.error("fetchEvents failed:", err);
    } finally {
      await new Promise((res) => setTimeout(res, 300)); // smooth out flicker
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents({}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoadMore = useMemo(
    () => hasMoreLocal || tmHasMore,
    [hasMoreLocal, tmHasMore]
  );
  const handleSearch = useCallback(
    (filters) => {
      if (loading) return;
      fetchEvents(filters, true);
    },
    [loading] // ✅ re-creates only when loading changes
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
            <FancySearchBar variant="browse" onSearch={handleSearch} />
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

        <AnimatePresence mode="wait">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.length === 0 ? (
              <p className="col-span-full text-center text-gray-600">
                No events available
              </p>
            ) : (
              events.map((ev) => (
                <motion.div
                  key={`${ev.external_source || "local"}-${ev.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventCard
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
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>

        {canLoadMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => {
                if (!loading) fetchEvents(filters);
              }}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Loading...
                </>
              ) : (
                "See More Events →"
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
