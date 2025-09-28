// src/pages/Browse.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"; // ✅ read URL params
import EventCard from "../components/EventCard.jsx";
import FancySearchBar from "../components/FancySearchBar.jsx";
import { supabase } from "../supabaseClient.js";

export default function Browse() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({});
  const location = useLocation(); // ✅ access query params

  const PAGE_SIZE = 12;

  const fetchEvents = async (newFilters = {}, reset = false) => {
    const appliedFilters = reset ? newFilters : filters;
    setFilters(appliedFilters);

    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("events")
      .select("*, categories(name)")
      .order("date_time", { ascending: true })
      .range(from, to);

    if (appliedFilters.event) {
      query = query.ilike("title", `%${appliedFilters.event}%`);
    }
    if (appliedFilters.location) {
      query = query.ilike("location", `%${appliedFilters.location}%`);
    }
    if (appliedFilters.category) {
      query = query.eq("category_id", appliedFilters.category);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching events:", error.message);
      return;
    }

    if (data) {
      if (reset) {
        setEvents(data);
        setPage(1);
      } else {
        setEvents((prev) => [...prev, ...data]);
        setPage((prev) => prev + 1);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
  };

  // ✅ Run on mount, check for ?search= query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");

    if (search) {
      fetchEvents({ event: search }, true); // ✅ pre-filter with search term
    } else {
      fetchEvents({}, true);
    }
  }, [location.search]);

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
              onSearch={(f) => fetchEvents(f, true)}
            />
          </div>
        </div>
      </section>

      {/* Events */}
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
            events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                date={event.date_time}
                price={event.price}
                location={event.location}
                description={event.description}
                category={event.categories?.name}
                seats_left={event.seats_left}
                image_url={event.image_url}
                creatorId={event.created_by}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {hasMore && (
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
