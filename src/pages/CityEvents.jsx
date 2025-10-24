import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { searchTicketmaster } from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

// City banner images

const cityImages = {
  london: "/img/London.png",
  manchester: "/img/Manchester.jpg",
  liverpool: "/img/Liverpool.jpg",
  glasgow: "/img/Glasgow.jpg",
  birmingham: "/img/Birmingham.jpg",
  edinburgh: "/img/edinburgh.webp",
};

export default function CityEvents() {
  const { cityName } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const cityKey = cityName.toLowerCase();
  const cityTitle = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
  const cityImage =
    cityImages[cityKey] || "https://placehold.co/1200x500?text=City+Events";

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);

      try {
        // 1️⃣ Fetch from your database
        const { data: dbEvents, error: dbError } = await supabase
          .from("events")
          .select("*")
          .ilike("location", `%${cityKey}%`);

        if (dbError) console.error("DB Error:", dbError.message);

        // 2️⃣ Fetch from Ticketmaster
        const tmData = await searchTicketmaster({ location: cityKey });
        const tmEvents = tmData?.events || [];

        // 3️⃣ Combine results
        const combined = [
          ...(dbEvents || []),
          ...tmEvents.map((e) => ({
            ...e,
            external_source: "ticketmaster",
          })),
        ];

        setEvents(combined);
      } catch (err) {
        console.error("Error fetching city events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [cityKey]);

  return (
    <section className="min-h-screen bg-gray-50 pb-20">
      {/* 🌆 City Banner */}
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

      {/* 🗓️ Events Section */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        {loading ? (
          <p className="text-gray-500 text-center mt-10">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            No upcoming events found in {cityTitle}.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
