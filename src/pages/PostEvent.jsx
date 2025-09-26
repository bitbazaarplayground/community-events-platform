// src/pages/PostEvent.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm.jsx";

export default function PostEvent({ user }) {
  // optionally fetch some admin data or stats here -> Maybe analytics, or quick links to manage events or You are Posting as <Your Name/Email>”.
  const [justPosted, setJustPosted] = useState(false);
  const [lastEventTitle, setLastEventTitle] = useState("");
  const navigate = useNavigate();

  const handleEventCreated = (newEvent) => {
    // Optional: newEvent param if EventForm returns data
    setJustPosted(true);
    setLastEventTitle(newEvent?.title || "");
  };

  const handlePostAnother = () => {
    setJustPosted(false);
    // Possibly reset scroll or focus
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleMyEvents = () => {
    navigate("/myevents");
  };

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4">Post a New Event</h2>
      <p className="mb-4 text-gray-600">
        Posting as <span className="font-medium">{user.email}</span>
      </p>

      {justPosted ? (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-green-800 mb-3">
            ✅ Event “{lastEventTitle}” posted!
          </p>
          <div className="space-x-4">
            <button
              onClick={handlePostAnother}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Post Another
            </button>
            <button
              onClick={handleMyEvents}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              My Events
            </button>
            <button
              onClick={handleGoHome}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Go Home
            </button>
          </div>
        </div>
      ) : (
        <EventForm user={user} onEventCreated={handleEventCreated} />
      )}
    </div>
  );
}
