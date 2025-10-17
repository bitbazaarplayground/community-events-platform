// src/pages/VerifyTicket.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function VerifyTicket() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("loading");
  const [updating, setUpdating] = useState(false);

  // 🟢 Fetch ticket and related event
  useEffect(() => {
    async function fetchTicket() {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, events(title, date_time, location)")
        .eq("id", ticketId)
        .single();

      if (error || !data) {
        console.warn("Ticket not found:", error?.message);
        setStatus("invalid");
      } else {
        setTicket(data);
        setStatus("valid");
      }
    }
    fetchTicket();
  }, [ticketId]);

  // 🔵 Mark ticket as used
  async function handleMarkUsed() {
    if (!ticket || ticket.used) return;
    setUpdating(true);
    const { error } = await supabase
      .from("tickets")
      .update({ used: true })
      .eq("id", ticketId);

    if (error) {
      alert("❌ Failed to mark as used.");
      console.error(error.message);
    } else {
      setTicket((prev) => ({ ...prev, used: true }));
    }
    setUpdating(false);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600">Verifying ticket...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center p-6">
        <h1 className="text-3xl font-bold text-red-600 mb-3">
          ❌ Invalid Ticket
        </h1>
        <p className="text-gray-700 mb-1">
          This ticket is either invalid, expired, or not found.
        </p>
        <a
          href="/"
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Back to Home
        </a>
      </div>
    );
  }

  const { events } = ticket || {};
  const event = events || {};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center border-t-4 border-green-500">
        <h1 className="text-3xl font-bold text-green-700 mb-2">
          {ticket.used ? "⚠️ Ticket Already Used" : "✅ Valid Ticket"}
        </h1>

        <p className="text-gray-700 mb-1">
          Event: <strong>{event.title || "Untitled Event"}</strong>
        </p>
        {event.date_time && (
          <p className="text-gray-700 mb-1">
            Date: {new Date(event.date_time).toLocaleString()}
          </p>
        )}
        {event.location && (
          <p className="text-gray-700 mb-1">Location: {event.location}</p>
        )}
        <p className="text-gray-700 mb-4">
          Owner: <strong>{ticket.user_email}</strong>
        </p>

        <p className="text-sm text-gray-500 mb-4">Ticket ID: {ticket.id}</p>

        {/* 🟣 Staff control */}
        {!ticket.used ? (
          <button
            onClick={handleMarkUsed}
            disabled={updating}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
          >
            {updating ? "Marking..." : "Mark Ticket as Used"}
          </button>
        ) : (
          <p className="text-red-600 text-sm font-semibold">
            ⚠️ This ticket has already been marked as used.
          </p>
        )}

        <a
          href="/"
          className="inline-block mt-5 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
