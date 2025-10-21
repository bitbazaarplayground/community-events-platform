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

  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [seats, setSeats] = useState("");
  //Dates

  const [dates, setDates] = useState([{ date: "", time: "12:30" }]);

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState("");

  // Categories
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  // UX state
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch categories only once after session is ready
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

  // Validate
  const cleanTime = (val) => (val || "").replace(/\s/g, "");
  const isValidTime = (val) => /^\d{2}:\d{2}$/.test(val);

  const validate = () => {
    // Trim and basic text fields
    if (!title.trim()) return "Title is required.";
    if (!description.trim()) return "Description is required.";
    if (!location.trim()) return "Location is required.";

    // Dates array checks
    if (!dates.length || !dates[0].date)
      return "At least one event date is required.";
    if (!dates[0].time)
      return "Please specify a start time for the first date.";

    // Ensure correct HH:MM format
    if (!isValidTime(dates[0].time))
      return "Time must be in HH:MM (24h) format.";

    // Category & seat validation
    if (!categoryId) return "Category is required.";
    if (!seats || isNaN(seats) || parseInt(seats) <= 0)
      return "Seats must be a positive number.";

    // Paid event validation
    if (isPaid && (!price || isNaN(price) || parseFloat(price) <= 0))
      return "Price must be a positive number for paid events.";

    // User must be logged in
    if (!user?.id) return "You must be logged in to post an event.";

    // No errors
    return null;
  };

  const addDate = () => {
    const last = dates[dates.length - 1];
    setDates([
      ...dates,
      {
        date: last?.date || "",
        time: last?.time || "12:30",
      },
    ]);
  };

  const removeDate = (index) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleDateChange = (index, field, value) => {
    const updated = [...dates];
    let v = value;
    if (field === "time") v = cleanTime(value);
    updated[index][field] = v;
    setDates(updated);
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
    const dateTime = `${dates[0].date}T${dates[0].time}:00`;
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

    const normalizedDates = dates.map((d) => ({
      date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
      time: d.time || "",
    }));

    // Prepare event data
    const finalPrice = isPaid ? parseFloat(price) || 0 : 0;
    const payload = {
      title,
      description,
      location,
      date_time: dateTime,
      extra_dates: normalizedDates,
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

  // Prevent rendering if session not ready
  if (!sessionChecked)
    return <p className="text-center text-gray-500">Loading session...</p>;
  if (!user)
    return (
      <p className="text-center text-gray-600">
        Please log in to create an event.
      </p>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/90 backdrop-blur-md border border-purple-100 rounded-2xl shadow-xl p-8 space-y-6 transition-all duration-300 hover:shadow-2xl"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900">
          Create a <span className="text-purple-600">New Event</span>
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Fill out the details below to share your event with the community.
        </p>
      </div>

      {errorMsg && (
        <p className="text-red-500 text-sm text-center -mt-2">{errorMsg}</p>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Event Title
        </label>
        <input
          type="text"
          placeholder="e.g., Manchester Jazz Evenings"
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Keep it short and catchy — up to 60 characters.
        </p>
        {errorMsg === "Title is required." && (
          <p className="text-xs text-red-500 mt-1">Please enter a title.</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Description
        </label>
        <textarea
          placeholder="Describe your event. Mention highlights or special guests."
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {errorMsg === "Description is required." && (
          <p className="text-xs text-red-500 mt-1">
            Please add a short description.
          </p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Location
        </label>
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          enableSuggestions={true}
        />
        <p className="text-xs text-gray-500 mt-1">
          📍 Include venue name or nearby landmark.
        </p>
      </div>

      {/* Multiple Dates Section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Event Dates & Times
        </label>

        {dates.map((d, i) => (
          <div key={i} className="flex gap-3 items-center">
            <input
              type="date"
              value={d.date}
              onChange={(e) => handleDateChange(i, "date", e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none w-1/2"
            />
            <input
              type="time"
              step="60"
              value={d.time}
              onChange={(e) => handleDateChange(i, "time", e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none w-1/2"
            />

            {i > 0 && (
              <button
                type="button"
                onClick={() => removeDate(i)}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addDate}
          className="text-purple-600 text-sm font-medium hover:underline"
        >
          + Add another date
        </button>
        {errorMsg === "At least one event date is required." && (
          <p className="text-xs text-red-500 mt-1">
            Please add at least one date.
          </p>
        )}
        {errorMsg === "Please specify a start time for the first date." && (
          <p className="text-xs text-red-500 mt-1">
            Please include a start time for your first date.
          </p>
        )}
        {errorMsg === "Time must be in HH:MM (24h) format." && (
          <p className="text-xs text-red-500 mt-1">
            Use 24-hour format like <strong>13:30</strong>.
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Category
        </label>
        <select
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
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
      </div>

      {/* Paid Event */}
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg p-3">
        <input
          id="paid-checkbox"
          type="checkbox"
          checked={isPaid}
          onChange={(e) => {
            const checked = e.target.checked;
            setIsPaid(checked);
            if (!checked) setPrice("");
          }}
          className="accent-purple-600"
        />
        <label
          htmlFor="paid-checkbox"
          className="text-sm text-gray-700 cursor-pointer"
        >
          This is a paid event
        </label>
      </div>

      {isPaid && (
        <input
          type="number"
          placeholder="Enter ticket price (£)"
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      )}

      {/* Seats */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Number of Seats
        </label>
        <input
          type="number"
          placeholder="Enter number of available seats"
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
        />
        {errorMsg === "Seats must be a positive number." && (
          <p className="text-xs text-red-500 mt-1">
            Please enter a valid seat number.
          </p>
        )}
      </div>

      {/* Image Upload */}
      <div className="grid sm:grid-cols-2 gap-6 items-start">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Upload Image
          </label>

          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <span className="text-sm text-gray-600 hover:text-purple-600 transition">
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
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Or Image URL (optional)
          </label>
          <input
            type="url"
            placeholder="https://…"
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            value={remoteImageUrl}
            onChange={(e) => {
              setRemoteImageUrl(e.target.value);
              if (imageFile) setImageFile(null);
            }}
          />
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mt-3">
          <img
            src={imagePreview}
            alt="Event preview"
            className="w-full max-w-md rounded-xl border border-gray-200 shadow-sm"
          />
        </div>
      )}

      {/* Status Message */}
      {statusMsg && (
        <p className="text-sm text-gray-600 italic mb-2 text-center">
          {statusMsg}
        </p>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Event"}
        </button>
      </div>
    </form>
  );
}
