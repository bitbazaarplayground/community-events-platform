// src/components/EventForm.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventForm({ user, onEventCreated }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.from("events").insert([
      {
        title,
        date_time: date,
        price,
        created_by: user.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Error creating event:", error.message);
    } else {
      onEventCreated(); // Refresh event list
      setTitle("");
      setDate("");
      setPrice("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md p-6 rounded mb-6"
    >
      <h3 className="text-lg font-semibold mb-4">Create New Event</h3>

      <input
        type="text"
        placeholder="Event Title"
        className="w-full border px-4 py-2 rounded mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="date"
        className="w-full border px-4 py-2 rounded mb-4"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Price (e.g. Free, $10, Pay What You Feel)"
        className="w-full border px-4 py-2 rounded mb-4"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Event"}
      </button>
    </form>
  );
}
