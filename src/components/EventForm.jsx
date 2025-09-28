import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventForm({ user, onEventCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:30");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [categoryId, setCategoryId] = useState(""); // ✅ selected category
  const [categories, setCategories] = useState([]); // ✅ available categories

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) {
        console.error("Error fetching categories:", error.message);
      } else {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (!description.trim()) return "Description is required.";
    if (!location.trim()) return "Location is required.";
    if (!date) return "Date is required.";
    if (!time) return "Time is required.";
    if (!categoryId) return "Category is required."; // ✅ ensure valid category
    if (!seats || isNaN(seats) || parseInt(seats) <= 0)
      return "Seats must be a positive number.";
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

    // ✅ Upload image to Supabase Storage
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

      image_url = publicUrlData.publicUrl;
    }

    // ✅ Insert new event into Supabase
    const { error } = await supabase.from("events").insert([
      {
        title,
        description,
        location,
        date_time: dateTime,
        price: price.trim() === "" ? "Free" : price,
        seats: parseInt(seats),
        seats_left: parseInt(seats),
        created_by: user.id,
        image_url,
        category_id: categoryId, // ✅ store category relation
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Error creating event:", error.message);
      setErrorMsg("Failed to create event: " + error.message);
    } else {
      // ✅ Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setTime("12:30");
      setPrice("");
      setSeats("");
      setImageFile(null);
      setCategoryId("");
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

      {/* ✅ Category dropdown */}
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

      <input
        type="text"
        placeholder="Price (leave blank for Free)"
        className="w-full border px-4 py-2 rounded"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

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
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Event"}
      </button>
    </form>
  );
}
