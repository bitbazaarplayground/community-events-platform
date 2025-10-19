// src/components/EventForm.jsx
import { useEffect, useMemo, useState } from "react";
import LocationAutocomplete from "../components/LocationAutocomplete.jsx";
import { useAuth } from "../context/AuthContext.jsx"; // ✅ added
import { supabase } from "../supabaseClient.js";

export default function EventForm({ onEventCreated }) {
  const { user, sessionChecked } = useAuth(); // ✅ get user globally

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:30");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
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

  // ✅ Fetch categories only once after session is ready
  useEffect(() => {
    if (!sessionChecked) return;
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) console.error("Error fetching categories:", error.message);
      else setCategories(data || []);
    };
    fetchCategories();
  }, [sessionChecked]);

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
    if (!user?.id) return "You must be logged in to post an event.";
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

    // Upload image (simple upload, no compression)
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      try {
        setStatusMsg("📤 Uploading image...");

        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError.message);
          setErrorMsg("Failed to upload image.");
          setStatusMsg("");
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);
        image_url = publicUrlData?.publicUrl || null;
      } catch (err) {
        console.error("Upload error:", err);
        setErrorMsg("Failed to upload image.");
        setStatusMsg("");
        setLoading(false);
        return;
      }
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
      created_by: user.id, // ✅ now comes from context
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

  // ✅ Prevent rendering if session not ready
  if (!sessionChecked)
    return <p className="text-center text-gray-500">Loading session...</p>;
  if (!user)
    return (
      <p className="text-center text-gray-600">
        Please log in to create an event.
      </p>
    );

  // ✅ render form as before
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md p-6 rounded mb-6 space-y-5"
    >
      <h3 className="text-lg font-semibold">Create New Event</h3>

      {errorMsg && <p className="text-red-500 text-sm -mt-1">{errorMsg}</p>}

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

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Location
      </label>
      <LocationAutocomplete
        value={location}
        onChange={setLocation}
        enableSuggestions={true}
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

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsPaid(checked);
              if (!checked) setPrice("");
            }}
          />
          <span className="text-sm">This is a paid event</span>
        </label>
      </div>

      {isPaid && (
        <input
          type="number"
          placeholder="Enter ticket price (£)"
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

      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <div>
          <label className="block text-sm font-medium mb-1">Upload Image</label>

          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <span className="text-sm text-gray-700 hover:text-purple-600 transition">
              📁 Click to upload
            </span>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setImageFile(e.target.files[0]);
                if (remoteImageUrl) setRemoteImageUrl("");
              }}
            />
          </label>

          {imageFile && (
            <p className="text-xs text-gray-500 mt-1 italic">
              Selected file: {imageFile.name}
            </p>
          )}

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
      {statusMsg && (
        <p className="text-sm text-gray-600 italic mb-2 text-center">
          {statusMsg}
        </p>
      )}

      <button
        type="submit"
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Event"}
      </button>
    </form>
  );
}
