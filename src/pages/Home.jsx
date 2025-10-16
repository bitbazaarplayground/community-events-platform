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
        "id, title, description, location, date_time, price, is_paid, seats_left, created_by, image_url, category_id, categories(name)"
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

    // === 2️⃣ Fetch Ticketmaster events (optional search, safe) ===
    let ticketmasterEvents = [];
    try {
      const tmRes = await searchTicketmaster({
        q: query,
        location: "",
        category: "",
      });

      ticketmasterEvents = (tmRes?.events || []).map((ev) => ({
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

      // 🧹 Dedupe Ticketmaster events exactly like Browse.jsx
      const grouped = {};

      // same normalization as Browse
      const normalizeText = (str = "") =>
        str
          .toLowerCase()
          .trim()
          .replace(/\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/gi, "")
          .replace(/\b\d{1,2}:\d{2}\b/g, "")
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      for (const ev of ticketmasterEvents) {
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
          const currentDate = new Date(grouped[key].date_time);
          if (date < currentDate) grouped[key].date_time = ev.date_time;
        }
      }

      // add extraCount and keep the earliest date
      ticketmasterEvents = Object.values(grouped).map((ev) => ({
        ...ev,
        extraCount: ev.extraDates.length,
        extraDates: ev.extraDates,
      }));
    } catch (err) {
      console.error("⚠️ Ticketmaster fetch failed:", err.message);
      ticketmasterEvents = [];
    }

    // === 3️⃣ Combine both sources ===
    // (simple, consistent shuffle for visual variety)
    const combined = [...localEvents, ...ticketmasterEvents]
      .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
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
                  is_paid={event.is_paid}
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
