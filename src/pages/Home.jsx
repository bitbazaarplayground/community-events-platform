// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import Hero from "../components/Hero.jsx";
import { searchTicketmaster } from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [homeQuery, setHomeQuery] = useState(""); // keep current query for "See More"
  const navigate = useNavigate();

  const TEASER_SIZE = 9; // show 6–8 on home; using 8 feels fuller

  const fetchTeaser = async (rawQuery = "") => {
    const query = (rawQuery || "").trim();
    setHomeQuery(query);

    // === 1️⃣ Fetch local events from Supabase ===
    let sb = supabase
      .from("events")
      .select(
        "id, title, description, location, date_time, price, seats_left, created_by, image_url, extra_dates, categories(name)"
      )
      .order("date_time", { ascending: true })
      .limit(TEASER_SIZE);

    if (query) {
      sb = sb.or(
        `title.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    const { data: localData, error: localError } = await sb;

    if (localError) {
      console.error("❌ Supabase error:", localError.message);
    }

    const localEvents = (localData || []).map((row) => ({
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
      extra_dates: row.extra_dates || [],
    }));

    // === 2️⃣ Fetch Ticketmaster events (optional search) ===
    const tmRes = await searchTicketmaster({
      q: query,
      location: "", // optional — could be user’s city later
      category: "",
    });

    const ticketmasterEvents = (tmRes?.events || [])
      .slice(0, TEASER_SIZE)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        date_time: ev.date_time,
        price: ev.price || null,
        location: ev.location || "",
        description: ev.description || "",
        image_url: ev.image_url,
        external_source: "ticketmaster",
        external_url: ev.external_url,
        external_organizer: ev.external_organizer,
        extraCount: ev.extraCount || 0,
        extraDates: ev.extraDates || [],
      }));

    // === 3️⃣ Combine both sources ===
    const combined = [...localEvents, ...ticketmasterEvents]
      .sort(() => Math.random() - 0.5) // small shuffle for variety
      .slice(0, TEASER_SIZE);

    setEvents(combined);
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
                  key={`${event.external_source || "local"}-${event.id}`}
                  id={event.id}
                  title={event.title}
                  date={event.date_time}
                  price={event.price}
                  location={event.location}
                  description={event.description}
                  category={event.category || event.categories?.name}
                  seats_left={event.seats_left}
                  image_url={event.image_url}
                  creatorId={event.creatorId}
                  external_source={event.external_source}
                  external_url={event.external_url}
                  external_organizer={event.external_organizer}
                  extraCount={event.extraCount}
                  extraDates={event.extraDates}
                  extra_dates={event.extra_dates}
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
