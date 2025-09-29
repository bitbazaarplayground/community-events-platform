// src/pages/Browse.jsx
import { useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchbar.jsx";
import { supabase } from "../supabaseClient.js";

// --- Eventbrite client (via your Supabase Edge Function) ---
async function searchEventbrite({ q, page = 1 }) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = new URL(`${base}/functions/v1/eventbrite-search`);
  if (q) url.searchParams.set("q", q);
  // If you added `page` support to your function, uncomment:
  // url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${anon}` },
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn("Eventbrite search failed:", t);
    return { events: [], hasMore: false };
  }
  const data = await res.json(); // EB returns { events, pagination, ... } for searches
  const items = Array.isArray(data?.events) ? data.events : [];
  const hasMore = Boolean(data?.pagination?.has_more_items);
  return { events: items, hasMore };
}

// --- Normalize Eventbrite event to your card shape ---
function normalizeEventbrite(ev) {
  const id = `eb_${ev.id}`;
  const title = ev?.name?.text || "Untitled";
  const date_time = ev?.start?.local || ev?.start?.utc || null;
  const isFree = Boolean(ev?.is_free);
  // Venue/address (requires expand=venue in the Edge Function)
  const location =
    ev?.venue?.address?.localized_address_display ||
    (ev?.online_event ? "Online" : "") ||
    ev?.venue?.name ||
    "";

  const description =
    ev?.summary || (ev?.description?.text || "").slice(0, 280); // trim for card

  const image_url = ev?.logo?.url || null;
  const categoryName = ev?.category?.name || null;

  // Price: if you want better pricing, parse ticket_classes from Eventbrite
  const price = isFree ? "Free" : "Paid";

  return {
    // your EventCard props
    id,
    title,
    date_time,
    price,
    location,
    description,
    image_url,
    seats_left: null, // unknown from EB in search
    creatorId: null, // external
    category: categoryName,

    // extra flags for EventCard
    external_source: "eventbrite",
    external_url: ev?.url || `https://www.eventbrite.com/e/${ev.id}`,
    external_organizer: ev?.organizer?.name || null,
  };
}

export default function Browse() {
  const [events, setEvents] = useState([]); // merged list
  const [page, setPage] = useState(0); // local pagination page
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true); // toggle EB
  const [ebHasMore, setEbHasMore] = useState(false); // if you add EB paging
  const [filters, setFilters] = useState({}); // last applied filters

  // Page size = 12 fits 4 rows * 3 cards
  const PAGE_SIZE = 12;

  // Build a single query string for EB from your filters
  const buildExternalQuery = (f) => {
    const bits = [];
    if (f.event) bits.push(f.event);
    if (f.location) bits.push(f.location);
    if (f.categoryLabel) bits.push(f.categoryLabel);
    return bits.join(" ").trim();
  };

  const fetchEvents = async (newFilters = {}, reset = false) => {
    const applied = reset ? newFilters : filters;
    setFilters(applied);

    // ----- 1) Local (Supabase) -----
    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("events")
      .select("*, categories(name)")
      .order("date_time", { ascending: true })
      .range(from, to);

    if (applied.event) {
      q = q.ilike("title", `%${applied.event}%`);
    }
    if (applied.location) {
      q = q.ilike("location", `%${applied.location}%`);
    }
    if (applied.category) {
      // category is an ID from the dropdown
      q = q.eq("category_id", applied.category);
    }

    const [{ data: localData, error: localErr }, ebResult] = await Promise.all([
      q,
      includeExternal
        ? searchEventbrite({
            q: buildExternalQuery({
              ...applied,
              // derive a human label for EB too (optional)
              categoryLabel: applied.categoryLabel,
            }),
            page: 1, // first page; (add paging later if needed)
          })
        : Promise.resolve({ events: [], hasMore: false }),
    ]);

    if (localErr) {
      console.error("Error fetching local events:", localErr.message);
    }

    // Normalize local rows to EventCard props
    const local = (localData || []).map((row) => ({
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

    // Normalize external
    const eb = (ebResult.events || []).map(normalizeEventbrite);

    // Merge + sort by date
    const merged = [...eb, ...local].sort((a, b) => {
      const da = a.date_time ? new Date(a.date_time).getTime() : 0;
      const db = b.date_time ? new Date(b.date_time).getTime() : 0;
      return da - db;
    });

    if (reset) {
      setEvents(merged);
      setPage(1);
    } else {
      setEvents((prev) => [...prev, ...merged]);
      setPage((prev) => prev + 1);
    }

    setHasMoreLocal((localData || []).length === PAGE_SIZE);
    setEbHasMore(Boolean(ebResult.hasMore)); // only meaningful if your function supports paging
  };

  // Initial load
  useEffect(() => {
    fetchEvents({}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build “See more” availability
  const canLoadMore = useMemo(
    () => hasMoreLocal || (includeExternal && ebHasMore),
    [hasMoreLocal, includeExternal, ebHasMore]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero section */}
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
                // Capture the human-readable category label too (for EB q)
                const categoryLabel = f.categoryLabel;
                fetchEvents({ ...f, categoryLabel }, true);
              }}
            />
          </div>
          {/* Include Eventbrite toggle */}
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/90">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-purple-500 scale-110"
                checked={includeExternal}
                onChange={(e) => {
                  setIncludeExternal(e.target.checked);
                  // re-run search with same filters
                  fetchEvents(filters, true);
                }}
              />
              Include Eventbrite results
            </label>
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
                key={ev.id}
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

// import { useEffect, useState } from "react";
// import { useLocation } from "react-router-dom"; // ✅ read URL params
// import EventCard from "../components/EventCard.jsx";
// import FancySearchBar from "../components/FancySearchBar.jsx";
// import { supabase } from "../supabaseClient.js";

// export default function Browse() {
//   const [events, setEvents] = useState([]);
//   const [page, setPage] = useState(0);
//   const [hasMore, setHasMore] = useState(true);
//   const [filters, setFilters] = useState({});
//   const location = useLocation(); // ✅ access query params

//   const PAGE_SIZE = 12;

//   const fetchEvents = async (newFilters = {}, reset = false) => {
//     const appliedFilters = reset ? newFilters : filters;
//     setFilters(appliedFilters);

//     const from = reset ? 0 : page * PAGE_SIZE;
//     const to = from + PAGE_SIZE - 1;

//     let query = supabase
//       .from("events")
//       .select("*, categories(name)")
//       .order("date_time", { ascending: true })
//       .range(from, to);

//     if (appliedFilters.event) {
//       query = query.ilike("title", `%${appliedFilters.event}%`);
//     }
//     if (appliedFilters.location) {
//       query = query.ilike("location", `%${appliedFilters.location}%`);
//     }
//     if (appliedFilters.category) {
//       query = query.eq("category_id", appliedFilters.category);
//     }

//     const { data, error } = await query;
//     if (error) {
//       console.error("Error fetching events:", error.message);
//       return;
//     }

//     if (data) {
//       if (reset) {
//         setEvents(data);
//         setPage(1);
//       } else {
//         setEvents((prev) => [...prev, ...data]);
//         setPage((prev) => prev + 1);
//       }
//       setHasMore(data.length === PAGE_SIZE);
//     }
//   };

//   // ✅ Run on mount, check for ?search= query
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const search = params.get("search");

//     if (search) {
//       fetchEvents({ event: search }, true); // ✅ pre-filter with search term
//     } else {
//       fetchEvents({}, true);
//     }
//   }, [location.search]);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Hero */}
//       <section className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white py-30 relative overflow-hidden">
//         <div className="max-w-5xl mx-auto px-6 text-center translate-y-[-40%] relative z-10">
//           <h2 className="text-lg font-semibold text-purple-200">
//             Find Your Next Experience
//           </h2>
//           <h1 className="text-4xl md:text-5xl font-extrabold mt-2">
//             Discover & Promote <br /> Upcoming Events
//           </h1>
//         </div>

//         {/* Floating Search Bar */}
//         <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[-90%] w-full max-w-4xl px-6 z-20">
//           <div className="bg-white rounded-lg shadow-lg border border-gray-100 hover:shadow-xl transition">
//             <FancySearchBar
//               variant="browse"
//               onSearch={(f) => fetchEvents(f, true)}
//             />
//           </div>
//         </div>
//       </section>

//       {/* Events */}
//       <section className="max-w-6xl mx-auto px-6 py-10">
//         <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-900">
//           Featured Events
//         </h2>
//         <p className="text-center text-gray-500 mb-10">
//           Upcoming events you won’t want to miss
//         </p>

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
//           {events.length === 0 ? (
//             <p className="col-span-full text-center text-gray-600">
//               No events available
//             </p>
//           ) : (
//             events.map((event) => (
//               <EventCard
//                 key={event.id}
//                 title={event.title}
//                 date={event.date_time}
//                 price={event.price}
//                 location={event.location}
//                 description={event.description}
//                 category={event.categories?.name}
//                 seats_left={event.seats_left}
//                 image_url={event.image_url}
//                 creatorId={event.created_by}
//               />
//             ))
//           )}
//         </div>

//         {/* Load more */}
//         {hasMore && (
//           <div className="flex justify-center mt-12">
//             <button
//               onClick={() => fetchEvents(filters)}
//               className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition"
//             >
//               See More Events →
//             </button>
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }
