// src/pages/Home.jsx
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import EventForm from "../components/EventForm.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { supabase } from "../supabaseClient.js";

export default function Home({ user, role }) {
  const [events, setEvents] = useState([]);
  const isAdmin = role === "admin";

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date_time", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error.message);
    } else {
      setEvents(data);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEventCreated = () => {
    fetchEvents(); // Refresh list when new event is created
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SearchBar />

      <main className="px-4 md:px-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
        </div>

        {isAdmin && (
          <EventForm user={user} onEventCreated={handleEventCreated} />
        )}

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
