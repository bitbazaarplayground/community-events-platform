// src/pages/MyEvents.jsx
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function MyEvents({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchMyEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", user.id)
        .order("date_time", { ascending: true });
      setLoading(false);
      if (error) {
        console.error("Error fetching my events:", error.message);
        setErrorMsg("Unable to load your events");
      } else {
        setEvents(data);
      }
    };

    fetchMyEvents();
  }, [user]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">My Events</h2>
      {loading && <p>Loading...</p>}
      {errorMsg && <p className="text-red-500">{errorMsg}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((evt) => (
          <EventCard
            key={evt.id}
            title={evt.title}
            date={evt.date_time}
            price={evt.price}
            location={evt.location}
            description={evt.description}
            event_type={evt.event_type}
            seats_left={evt.seats_left}
            image_url={evt.image_url}
            creatorId={evt.created_by}
          />
        ))}
      </div>
      {!loading && events.length === 0 && (
        <p className="text-gray-600 mt-4">
          You have not posted any events yet.
        </p>
      )}
    </div>
  );
}
