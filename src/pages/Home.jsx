// src/pages/Home.jsx
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import Hero from "../components/Hero.jsx";
import { supabase } from "../supabaseClient.js";

export default function Home({ user, role }) {
  const [events, setEvents] = useState([]);

  // Fetch events (optionally filtered by search query)
  const fetchEvents = async (query = "") => {
    let supabaseQuery = supabase
      .from("events")
      .select("*")
      .order("date_time", { ascending: true });

    if (query) {
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${query}%,location.ilike.%${query}%,event_type.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    const { data, error } = await supabaseQuery;
    if (error) {
      console.error("Error fetching events:", error.message);
    } else {
      setEvents(data);
    }
  };

  useEffect(() => {
    fetchEvents(); // Load all events initially
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero with search bar */}
      <Hero onSearch={fetchEvents} />

      <main className="px-4 md:px-12">
        <h2 className="text-xl font-semibold mb-6">Upcoming Events</h2>

        {events.length === 0 ? (
          <p className="text-gray-600">No events found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                date={event.date_time}
                price={event.price}
                location={event.location}
                description={event.description}
                event_type={event.event_type}
                seats_left={event.seats_left}
                image_url={event.image_url}
                creatorId={event.created_by}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
