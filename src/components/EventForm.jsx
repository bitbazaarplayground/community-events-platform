// src/components/EventForm.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventForm({ user, onEventCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [eventType, setEventType] = useState("free");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!title.trim()) {
      return "Title is required.";
    }
    if (!description.trim()) {
      return "Description is required.";
    }
    if (!location.trim()) {
      return "Location is required.";
    }
    if (!date) {
      return "Date is required.";
    }
    if (!time) {
      return "Time is required.";
    }
    if (eventType !== "free" && !price.trim()) {
      return "Price is required for non‑free events.";
    }
    if (!seats || isNaN(seats) || parseInt(seats) <= 0) {
      return "Seats must be a positive number.";
    }
    // image is optional
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    // Combine date + time into a proper timestamp string
    const dateTime = `${date}T${time}:00`;

    let image_url = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error("Image upload error:", uploadError.message);
        setLoading(false);
        setErrorMsg("Failed to upload image.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      image_url = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("events").insert([
      {
        title,
        description,
        location,
        date_time: dateTime,
        event_type: eventType,
        price: eventType === "free" ? "Free" : price,
        seats: parseInt(seats),
        seats_left: parseInt(seats),
        created_by: user.id,
        image_url,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Error creating event:", error.message);
      setErrorMsg("Failed to create event: " + error.message);
    } else {
      // Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setTime("");
      setEventType("free");
      setPrice("");
      setSeats("");
      setImageFile(null);
      setErrorMsg("");
      onEventCreated();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md p-6 rounded mb-6 space-y-4"
    >
      <h3 className="text-lg font-semibold mb-4">Create New Event</h3>

      {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}

      <input
        type="text"
        placeholder="Event Title"
        className="w-full border px-4 py-2 rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Description"
        className="w-full border px-4 py-2 rounded"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="text"
        placeholder="Location"
        className="w-full border px-4 py-2 rounded"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <div className="flex gap-4">
        <input
          type="date"
          className="w-1/2 border px-4 py-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          className="w-1/2 border px-4 py-2 rounded"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <select
        className="w-full border px-4 py-2 rounded"
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
      >
        <option value="free">Free</option>
        <option value="fixed">Fixed Price</option>
        <option value="donation">Donation</option>
      </select>

      {eventType !== "free" && (
        <input
          type="text"
          placeholder="Price"
          className="w-full border px-4 py-2 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      )}

      <input
        type="number"
        placeholder="Number of seats"
        className="w-full border px-4 py-2 rounded"
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
      />

      <input
        type="file"
        accept="image/*"
        className="w-full"
        onChange={(e) => setImageFile(e.target.files[0])}
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
