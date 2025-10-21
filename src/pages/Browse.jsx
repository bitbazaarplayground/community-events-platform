import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchbar.jsx";
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
    if (loading) return;
    setLoading(true);
    // Clear any old prefetched data if filters changed
    const cachedNext = localStorage.getItem("nextTmPage");
    if (cachedNext) {
      try {
        const { filters: cachedFilters } = JSON.parse(cachedNext);
        // compare old cached filters to current ones
        if (JSON.stringify(cachedFilters) !== JSON.stringify(newFilters)) {
          // console.log("Clearing outdated prefetched data (filters changed)");
          localStorage.removeItem("nextTmPage");
        }
      } catch {
        localStorage.removeItem("nextTmPage");
      }
    }

    const applied = reset ? newFilters : filters;

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
      // === Local events from Supabase ===
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

      if (localRes.error) {
        console.error("❌ Supabase error:", localRes.error.message);
      }

      const localData = localRes.data || [];
      const local = localData.map((row) => ({
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
        external_organizer: null,
        extra_dates: row.extra_dates || [],
      }));

      // === Ticketmaster events ===
      let ticketmaster = [];
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

        ticketmaster = tmRes?.events || [];
        setTmUnavailable(false);
      } catch (err) {
        console.error("⚠️ Ticketmaster API unavailable:", err.message);
        setTmUnavailable(true);
        ticketmaster = [];
      }

      /// === Dedupe Ticketmaster events ===
      const hasKeyword = Boolean(applied.event?.trim());
      const hasAnyFilter =
        hasKeyword ||
        Boolean(applied.location?.trim()) ||
        Boolean(applied.categoryLabel?.trim());

      // Helper
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

      // Dedupe
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

        // +X more dates available
        ticketmaster = Object.values(grouped).map((ev) => ({
          ...ev,
          extraCount: ev.extraDates.length,
          extraDates: ev.extraDates,
        }));
      }

      // === Combine both sources ===
      let combined = [...local, ...ticketmaster];

      // === Sort or shuffle depending on filters ===
      if (!hasAnyFilter && reset) {
        combined = combined.sort(() => Math.random() - 0.5);
      } else {
        combined = combined.sort((a, b) => {
          const da = a.date_time ? new Date(a.date_time).getTime() : 0;
          const db = b.date_time ? new Date(b.date_time).getTime() : 0;
          return da - db;
        });
      }

      // === Interleave local + Ticketmaster events ===
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

      // === Save results ===
      if (reset) {
        setEvents(interleaved);
        setPage(1);
        setTmPage(tmRes.nextPage || 0);
      } else {
        setEvents((prev) => [...prev, ...interleaved]);
        setPage((prev) => prev + 1);
        setTmPage(tmRes.nextPage || tmPage);
      }

      setHasMoreLocal((prev) =>
        reset
          ? localData.length === PAGE_SIZE
          : prev && localData.length === PAGE_SIZE
      );

      setTmHasMore((prev) => (reset ? tmRes.hasMore : prev || tmRes.hasMore));

      if (reset && ticketmaster.length > 0) {
        try {
          const preload = await searchTicketmaster(applied, tmPage + 1);
          if (preload?.events?.length) {
            localStorage.setItem(
              "nextTmPage",
              JSON.stringify({
                filters: applied,
                data: preload,
              })
            );
          }
        } catch (err) {
          console.warn("⚠️ Prefetch failed:", err.message);
        }
      }
    } catch (err) {
      console.error("fetchEvents failed:", err);
    } finally {
      await new Promise((res) => setTimeout(res, 300));
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents({}, true);
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
    [loading]
  );

  return (
    <>
      {/* Browse Hero + Results Section */}
      <section className="w-full">
        {/*Background Video */}
        <section className="relative text-white py-32 overflow-hidden">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/video/Fireworks.mp4"
            autoPlay
            loop
            muted
            playsInline
          />

          {/* Overlay*/}
          <div className="absolute inset-0 bg-gradient-to-br from-[#000000]/20 via-[#1E1B4B]/30 to-[#312E81]/25"></div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center translate-y-[-40%]">
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

        {/* Divider */}
        <div className="relative">
          <svg
            className="absolute top-0 left-0 w-full h-16 text-white"
            preserveAspectRatio="none"
            viewBox="0 0 1440 320"
          >
            <path
              fill="currentColor"
              d="M0,192L80,181.3C160,171,320,149,480,160C640,171,800,213,960,229.3C1120,245,1280,235,1360,229.3L1440,224V320H1360C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320H0Z"
            ></path>
          </svg>
        </div>

        {/* Results Section */}
        <section className="bg-white max-w-6xl mx-auto px-6 py-16 relative z-10">
          <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-900">
            Featured Events
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Upcoming events you won’t want to miss
          </p>

          {tmUnavailable && (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-center py-3 px-4 rounded mb-8">
              ⚠️ Some external events (Ticketmaster) are temporarily
              unavailable. Local events from our community are still visible —
              please try again later.
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
                    <EventCard
                      id={ev.id}
                      title={ev.title}
                      date={ev.date_time}
                      price={ev.price}
                      is_paid={ev.is_paid}
                      location={ev.location}
                      description={ev.description}
                      category={ev.category}
                      seats_left={ev.seats_left}
                      image_url={ev.image_url}
                      creatorId={ev.creatorId}
                      external_source={ev.external_source}
                      external_url={ev.external_url}
                      external_organizer={ev.external_organizer}
                      extraCount={ev.extraCount}
                      extraDates={ev.extraDates}
                      extra_dates={ev.extra_dates}
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
                  if (loading) return;

                  const cachedNext = localStorage.getItem("nextTmPage");
                  if (cachedNext) {
                    try {
                      const { filters: cachedFilters, data } =
                        JSON.parse(cachedNext);
                      if (
                        JSON.stringify(cachedFilters) ===
                        JSON.stringify(filters)
                      ) {
                        setEvents((prev) => [...prev, ...data.events]);
                        setTmPage(data.nextPage || tmPage);
                        setTmHasMore(data.hasMore);
                        localStorage.removeItem("nextTmPage");
                        return;
                      }
                    } catch (err) {
                      console.warn("⚠️ Failed to use prefetched data:", err);
                      localStorage.removeItem("nextTmPage");
                    }
                  }

                  fetchEvents(filters);
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
      </section>
    </>
  );
}
