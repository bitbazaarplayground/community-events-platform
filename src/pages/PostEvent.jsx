// src/pages/PostEvent.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/PostEvent.css";

export default function PostEvent() {
  const { user, sessionChecked, userRole } = useAuth();
  const [justPosted, setJustPosted] = useState(false);
  const [lastEventTitle, setLastEventTitle] = useState("");
  const navigate = useNavigate();

  const handleEventCreated = (newEvent) => {
    setJustPosted(true);
    setLastEventTitle(newEvent?.title || "");
  };

  const handlePostAnother = () => setJustPosted(false);
  const handleGoHome = () => navigate("/");
  const handleMyEvents = () => navigate("/myevents");

  if (!sessionChecked)
    return <p className="text-center text-gray-500">Loading session...</p>;

  if (!user)
    return (
      <p className="text-center text-gray-600">
        Please log in to post a new event.
      </p>
    );

  if (userRole !== "admin")
    return (
      <p className="text-center text-red-500">
        Only admins can post new events.
      </p>
    );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 overflow-hidden">
      {/* Animated light overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.15),_transparent_60%)] animate-shimmer" />

      {/* Hero Section */}
      <section className="relative z-10 text-center text-white py-24 px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">
          Post a New Event
        </h1>
        <p className="text-purple-100 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Inspire your community — share your workshops, meetups, or concerts
          and bring people together.
        </p>
      </section>

      {/* Main Content */}
      <div className="relative z-20 max-w-3xl mx-auto px-6 -mt-10 pb-16">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-100 p-8 hover:shadow-purple-200 transition-all duration-300">
          {justPosted ? (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-400 p-5 rounded-lg mb-6 shadow-sm">
              <p className="text-green-800 mb-3 font-medium">
                ✅ Event “{lastEventTitle}” posted successfully!
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handlePostAnother}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Post Another
                </button>
                <button
                  onClick={handleMyEvents}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  My Events
                </button>
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Go Home
                </button>
              </div>
            </div>
          ) : (
            <EventForm onEventCreated={handleEventCreated} />
          )}
        </div>
      </div>
    </div>
  );
}
