// src/pages/PastEvents.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function PastEvents() {
  const navigate = useNavigate();
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("signups")
        .select("event_id, events(*)")
        .eq("user_id", userId)
        .lt("events.date_time", new Date().toISOString());

      if (!error && data) {
        setPastEvents(data.map((row) => row.events).filter(Boolean)); // ✅ filter out nulls
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="p-6 text-gray-600">Loading past events…</p>;
  if (pastEvents.length === 0)
    return (
      <p className="p-6 text-gray-600">You don’t have any past events yet.</p>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Past Events</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pastEvents.map((ev) => (
          <EventCard key={ev.id} {...ev} />
        ))}
      </div>
    </div>
  );
}
