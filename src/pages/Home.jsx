// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import Hero from "../components/Hero.jsx";
import { supabase } from "../supabaseClient.js";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [homeQuery, setHomeQuery] = useState(""); // keep current query for "See More"
  const navigate = useNavigate();

  const TEASER_SIZE = 9; // show 6–8 on home; using 8 feels fuller

  // Fetch teaser (with optional search)
  const fetchTeaser = async (rawQuery = "") => {
    const query = (rawQuery || "").trim();
    setHomeQuery(query);

    let sb = supabase
      .from("events")
      .select("*, categories(name)")
      .order("date_time", { ascending: true })
      .limit(TEASER_SIZE);

    // Title/Location/Description search on server
    if (query) {
      sb = sb.or(
        `title.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    const { data, error } = await sb;

    if (error) {
      console.error("Error fetching events:", error.message);
      setEvents([]);
      return;
    }

    // Category search on client (Supabase can't filter joined field directly here)
    const finalData =
      query.length > 0
        ? (data || [])
            .filter((e) =>
              e?.categories?.name?.toLowerCase().includes(query.toLowerCase())
            )
            .concat(
              // also include matches already found by title/location/description
              (data || []).filter(
                (e) =>
                  !e?.categories?.name ||
                  !e.categories.name.toLowerCase().includes(query.toLowerCase())
              )
            )
            .slice(0, TEASER_SIZE) // keep to teaser size
        : data || [];

    setEvents(finalData);
  };

  // Initial teaser (no search)
  useEffect(() => {
    fetchTeaser("");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Home hero: typing filters teaser IN PLACE, no redirect */}
      <Hero
        onSearch={(q) => {
          // Called (debounced) from FancySearchBar; filter teaser only
          fetchTeaser(q);
        }}
      />

      <main className="px-4 md:px-12">
        <h2 className="text-xl font-semibold mb-6">Upcoming Events</h2>

        {events.length === 0 ? (
          <p className="text-gray-600">No events found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
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
              ))}
            </div>

            {/* Redirect to Browse ONLY when user clicks this.
                Preserve the current homeQuery in the URL if present. */}
            <div className="flex justify-center mt-12">
              <button
                onClick={() =>
                  navigate(
                    homeQuery
                      ? `/browse?search=${encodeURIComponent(homeQuery)}`
                      : "/browse"
                  )
                }
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition"
              >
                See More Events →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
