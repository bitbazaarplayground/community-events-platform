// src/pages/PostEvent.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm.jsx";
import { useAuth } from "../context/AuthContext.jsx"; // ✅ get user from context

export default function PostEvent() {
  const { user, sessionChecked, userRole } = useAuth(); // ✅ global context
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

  // ✅ Wait for session before rendering
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
    <div className="max-w-lg mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4">Post a New Event</h2>

      <p className="mb-4 text-gray-600">
        Posting as{" "}
        <span className="font-medium">{user.email || "Unknown user"}</span>
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
        <EventForm onEventCreated={handleEventCreated} />
      )}
    </div>
  );
}
