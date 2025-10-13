// src/components/EventForm.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventForm({ user, onEventCreated }) {
  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:30");
  const [isPaid, setIsPaid] = useState(false); // 🆕 toggle for paid/free
  const [price, setPrice] = useState("");

  const [seats, setSeats] = useState("");

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState("");

  // Categories
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  // UX state
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name");
      if (error) console.error("Error fetching categories:", error.message);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const imagePreview = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (remoteImageUrl) return remoteImageUrl;
    return "";
  }, [imageFile, remoteImageUrl]);

  // Validate form
  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (!description.trim()) return "Description is required.";
    if (!location.trim()) return "Location is required.";
    if (!date) return "Date is required.";
    if (!time) return "Time is required.";
    if (!categoryId) return "Category is required.";
    if (!seats || isNaN(seats) || parseInt(seats) <= 0)
      return "Seats must be a positive number.";
    if (isPaid && (!price || isNaN(price) || parseFloat(price) <= 0))
      return "Price must be a positive number for paid events.";
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
    const dateTime = `${date}T${time}:00`;
    let image_url = null;

    // Upload image (same as before)
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
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
      image_url = publicUrlData?.publicUrl || null;
    } else if (remoteImageUrl) {
      image_url = remoteImageUrl;
    }

    // Prepare event data
    const finalPrice = isPaid ? parseFloat(price) || 0 : 0;

    const payload = {
      title,
      description,
      location,
      date_time: dateTime,
      price: finalPrice,
      is_paid: isPaid,
      seats: parseInt(seats),
      seats_left: parseInt(seats),
      created_by: user.id,
      image_url,
      category_id: categoryId,
      external_source: null,
      external_id: null,
      external_url: null,
      external_organizer: null,
      external_is_free: null,
    };

    const { error } = await supabase.from("events").insert([payload]);
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
      setTime("12:30");
      setPrice("");
      setSeats("");
      setIsPaid(false);
      setImageFile(null);
      setRemoteImageUrl("");
      setCategoryId("");
      setErrorMsg("");
      onEventCreated?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md p-6 rounded mb-6 space-y-5"
    >
      <h3 className="text-lg font-semibold">Create New Event</h3>

      {errorMsg && <p className="text-red-500 text-sm -mt-1">{errorMsg}</p>}

      {/* ---------- Basic fields ---------- */}
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
        rows={4}
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

      {/* Category */}
      <select
        className="w-full border px-4 py-2 rounded"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">Select a category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* 🆕 Paid / Free toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsPaid(checked);
              if (!checked) setPrice(""); // reset price when switching to free
            }}
          />
          <span className="text-sm">This is a paid event</span>
        </label>
      </div>

      {/* 🆕 Price input only if paid */}
      {isPaid && (
        <input
          type="number"
          placeholder="Enter ticket price (£)"
          className="w-full border px-4 py-2 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      )}

      {/* Show price input only if paid */}
      {/* {isPaid && (
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter price (£)"
          className="w-full border px-4 py-2 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      )} */}

      {/* Seats */}
      <input
        type="number"
        placeholder="Number of seats"
        className="w-full border px-4 py-2 rounded"
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
      />

      {/* Image upload & preview (unchanged) */}
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <div>
          <label className="block text-sm font-medium mb-1">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full"
            onChange={(e) => {
              setImageFile(e.target.files[0]);
              if (remoteImageUrl) setRemoteImageUrl("");
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            If you upload a file, it will override any image URL.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Or Image URL (optional)
          </label>
          <input
            type="url"
            placeholder="https://…"
            className="w-full border px-3 py-2 rounded"
            value={remoteImageUrl}
            onChange={(e) => {
              setRemoteImageUrl(e.target.value);
              if (imageFile) setImageFile(null);
            }}
          />
        </div>
      </div>

      {imagePreview && (
        <div className="mt-2">
          <img
            src={imagePreview}
            alt="Event preview"
            className="w-full max-w-md rounded shadow-sm"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Event"}
      </button>
    </form>
  );
}
