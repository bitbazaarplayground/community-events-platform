// src/pages/SavedEvents.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

const FALLBACK_IMAGE = "https://placehold.co/600x360?text=Event";
const isUuid = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str
  );

export default function SavedEvents() {
  const navigate = useNavigate();
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1) fetch saved rows
      const { data, error } = await supabase
        .from("saved_events")
        .select("event_id, title, location, image_url, external_url, source")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading saved events:", error.message);
        setLoading(false);
        return;
      }

      const localIds = data
        .filter((ev) => isUuid(ev.event_id))
        .map((ev) => ev.event_id);

      // 2) fetch local event details
      let localEvents = [];
      if (localIds.length > 0) {
        const { data: evs, error: err2 } = await supabase
          .from("events")
          .select("id, created_by")
          .in("id", localIds);

        if (err2) {
          console.error("Error loading local events:", err2.message);
        } else {
          localEvents = evs;
        }
      }

      // 3) merge
      const formatted = data.map((ev) => {
        const isLocal = isUuid(ev.event_id);
        const creator = isLocal
          ? localEvents.find((row) => row.id === ev.event_id)?.created_by
          : null;

        return {
          id: ev.event_id,
          title: ev.title,
          location: ev.location,
          image_url: ev.image_url || FALLBACK_IMAGE,
          external_url: ev.external_url,
          external_source: isLocal ? null : "ticketmaster",
          creatorId: creator,
        };
      });

      setSavedEvents(formatted);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return <p className="p-6 text-gray-600">Loading saved events…</p>;
  if (savedEvents.length === 0)
    return (
      <p className="p-6 text-gray-600">You don’t have any saved events yet.</p>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Saved Events</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedEvents.map((ev) => (
          <EventCard key={ev.id} {...ev} />
        ))}
      </div>
    </div>
  );
}
