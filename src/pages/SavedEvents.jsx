// src/pages/SavedEvents.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const FALLBACK_IMAGE = "https://placehold.co/600x360?text=Event";

export default function SavedEvents() {
  const navigate = useNavigate();
  const { user, sessionChecked, savedEvents, savedLoading, fetchSavedEvents } =
    useAuth();

  // Fetch saved events if logged in but not loaded yet
  useEffect(() => {
    if (sessionChecked && user && savedEvents.length === 0) {
      fetchSavedEvents();
    }
  }, [user, sessionChecked]);

  // Loading states
  if (!sessionChecked)
    return (
      <p className="p-6 text-gray-600 text-center">Checking your session…</p>
    );

  if (!user)
    return (
      <p className="p-6 text-gray-600 text-center">
        Please sign in to view your saved events.
      </p>
    );

  if (savedLoading)
    return (
      <p className="p-6 text-gray-600 text-center">Loading saved events…</p>
    );

  if (savedEvents.length === 0)
    return (
      <p className="p-6 text-gray-600 text-center">
        You don’t have any saved events yet.
      </p>
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

      {/* Grid of saved events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedEvents.map((ev) => (
          <EventCard
            key={ev.id}
            id={ev.id}
            title={ev.title}
            location={ev.location}
            image_url={ev.image_url || FALLBACK_IMAGE}
            external_url={ev.external_url}
            external_source={ev.external_source}
          />
        ))}
      </div>
    </div>
  );
}
