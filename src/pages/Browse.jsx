// src/pages/Browse.jsx
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  logTicketmasterCategories,
  searchTicketmaster,
} from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

// Map between site’s categories and Ticketmaster segments
const TM_SEGMENT_MAP = {
  Music: "KZFzniwnSyZfZ7v7nJ",
  "Arts & Theatre": "KZFzniwnSyZfZ7v7na",
  Sports: "KZFzniwnSyZfZ7v7nE",
  "Film & Cinema": "KZFzniwnSyZfZ7v7nn",
  "Family & Kids": "KZFzniwnSyZfZ7v7n1",
  "Festivals & Lifestyle": "KZFzniwnSyZfZ7v7nn",
  Other: "",
};

export default function Browse() {
  const { sessionChecked } = useAuth();
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [filters, setFilters] = useState({});
  const [tmPage, setTmPage] = useState(0);
  const [tmHasMore, setTmHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tmUnavailable, setTmUnavailable] = useState(false);

  const PAGE_SIZE = 12;

  useEffect(() => {
    logTicketmasterCategories();
  }, []);

  const fetchEvents = async (newFilters = {}, reset = false) => {
    if (!sessionChecked) return;
    if (loading) return;
    setLoading(true);

    const applied = reset ? newFilters : filters;

    // Resolve category name
    if (applied.category && !applied.categoryLabel) {
      const { data: cat, error } = await supabase
        .from("categories")
        .select("name")
        .eq("id", applied.category)
        .maybeSingle();
      if (!error && cat?.name) applied.categoryLabel = cat.name;
    }

    setFilters(applied);
    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // === 1️⃣ Local events ===
      let q = supabase
        .from("events")
        .select(
          "id, title, description, location, date_time, price, is_paid, seats_left, created_by, image_url, category_id, extra_dates, categories(name)"
        )
        .order("date_time", { ascending: true })
        .range(from, to);

      if (applied.event) q = q.ilike("title", `%${applied.event}%`);
      if (applied.location) q = q.ilike("location", `%${applied.location}%`);
      if (applied.category) q = q.eq("category_id", applied.category);

      const localRes = await q;
      const localData = localRes.data || [];

      // ✅ Proper deduplication (restored original behavior)
      const groupedLocal = {};
      for (const ev of localData) {
        const key = `${ev.title}::${ev.location}`;
        const date = ev.date_time;
        if (!groupedLocal[key]) {
          groupedLocal[key] = { ...ev, extra_dates: [] };
        } else {
          groupedLocal[key].extra_dates.push(date);
          const currentDate = new Date(groupedLocal[key].date_time);
          if (new Date(date) < currentDate) groupedLocal[key].date_time = date; // keep earliest date
        }
      }

      const localEvents = Object.values(groupedLocal).map((row) => ({
        id: row.id,
        title: row.title,
        date_time: row.date_time,
        price: row.price,
        is_paid: row.is_paid,
        location: row.location,
        description: row.description,
        image_url: row.image_url,
        seats_left: row.seats_left,
        creatorId: row.created_by,
        category: row.categories?.name || null,
        external_source: null,
        external_url: null,
        extra_dates: row.extra_dates,
      }));

      // === 2️⃣ Ticketmaster events ===
      let tmRes = { events: [], nextPage: 0, hasMore: false };
      try {
        const tmCategory =
          applied?.categoryLabel && TM_SEGMENT_MAP[applied.categoryLabel]
            ? TM_SEGMENT_MAP[applied.categoryLabel]
            : "";
        tmRes = await searchTicketmaster(
          {
            q: applied.event || "",
            location: applied.location || "",
            category: tmCategory,
          },
          reset ? 0 : tmPage
        );
        setTmUnavailable(false);
      } catch (err) {
        console.warn("⚠️ TM API unavailable:", err.message);
        setTmUnavailable(true);
      }

      // ✅ Group Ticketmaster duplicates (restored original grouping)
      const groupedTM = {};
      for (const ev of tmRes.events || []) {
        const key = `${ev.title}::${ev.location}`;
        const date = ev.date_time;
        if (!groupedTM[key]) {
          groupedTM[key] = { ...ev, extraDates: [] };
        } else {
          groupedTM[key].extraDates.push(date);
          const currentDate = new Date(groupedTM[key].date_time);
          if (new Date(date) < currentDate)
            groupedTM[key].date_time = ev.date_time;
        }
      }

      const tmEvents = Object.values(groupedTM).map((ev) => ({
        ...ev,
        extraCount: ev.extraDates?.length,
        extraDates: ev.extraDates,
      }));

      // === 3️⃣ Combine + Interleave ===
      const combined = [...localEvents, ...tmEvents];
      const localOnly = combined.filter((e) => !e.external_source);
      const tmOnly = combined.filter(
        (e) => e.external_source === "ticketmaster"
      );

      const interleaved = [];
      while (localOnly.length || tmOnly.length) {
        const useLocal =
          Math.random() < 0.5
            ? localOnly.length > 0
            : tmOnly.length === 0
            ? true
            : false;
        if (useLocal && localOnly.length) interleaved.push(localOnly.pop());
        else if (tmOnly.length) interleaved.push(tmOnly.pop());
      }

      // === 4️⃣ Apply sorting ===
      const hasFilters =
        applied.event || applied.location || applied.categoryLabel;
      const sorted = hasFilters
        ? interleaved.sort(
            (a, b) => new Date(a.date_time) - new Date(b.date_time)
          )
        : interleaved.sort(() => Math.random() - 0.5);

      // === 5️⃣ Set State ===
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionChecked) fetchEvents({}, true);
  }, [sessionChecked]);

  const canLoadMore = useMemo(
    () => hasMoreLocal || tmHasMore,
    [hasMoreLocal, tmHasMore]
  );

  const handleSearch = useCallback(
    (filters) => {
      if (loading) return;
      fetchEvents(filters, true);
    },
    [loading]
  );

  if (!sessionChecked) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Loading events...
      </div>
    );
  }

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

        {tmUnavailable && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-center py-3 px-4 rounded mb-8">
            ⚠️ Some external events (Ticketmaster) are temporarily unavailable.
          </div>
        )}

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
                  <EventCard {...ev} />
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>

        {canLoadMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => fetchEvents(filters)}
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
