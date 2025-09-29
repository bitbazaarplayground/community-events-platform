// src/components/EventForm.jsx
import { useEffect, useMemo, useState } from "react";
import { extractEventbriteId, getEventbriteById } from "../lib/eventbrite.js";
import { supabase } from "../supabaseClient.js";

/** Map Eventbrite category name → your categories list (by name). Fallback to 'Other'. */
function resolveCategoryIdFromName(ebName, categories) {
  if (!ebName || !Array.isArray(categories)) return "";
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

  // loose mappings
  const map = new Map([
    ["music", "Music"],
    ["nightlife", "Nightlife"],
    ["performing & visual arts", "Performing & Visual Arts"],
    ["performing and visual arts", "Performing & Visual Arts"],
    ["arts", "Performing & Visual Arts"],
    ["hobbies", "Hobbies"],
    ["business", "Business"],
    ["food & drink", "Food & Drinks"],
    ["food and drink", "Food & Drinks"],
  ]);

  const targetName = map.get(norm(ebName)) || ebName;
  const exact = categories.find((c) => norm(c.name) === norm(targetName));
  if (exact) return exact.id;

  const other = categories.find((c) => norm(c.name) === "other");
  return other ? other.id : "";
}

export default function EventForm({ user, onEventCreated }) {
  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:30");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");

  // Image handling
  const [imageFile, setImageFile] = useState(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState("");

  // Categories
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  // External (Eventbrite) metadata
  const [externalSource, setExternalSource] = useState("");
  const [externalId, setExternalId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalOrganizer, setExternalOrganizer] = useState("");
  const [externalIsFree, setExternalIsFree] = useState(null);

  // Import UI state
  const [importInput, setImportInput] = useState("");
  const [importing, setImporting] = useState(false);

  // UX state
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name");
      if (error) {
        console.error("Error fetching categories:", error.message);
      } else {
        setCategories(data || []);
      }
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
    return null;
  };

  async function handleImport() {
    setErrorMsg("");
    const id = extractEventbriteId(importInput);
    if (!id) {
      setErrorMsg("Please paste a valid Eventbrite URL or numeric ID.");
      return;
    }
    setImporting(true);
    try {
      const eb = await getEventbriteById(id);

      // Map EB -> fields
      const ebTitle = eb?.name?.text || "";
      const ebDesc = eb?.description?.text || eb?.summary || "";
      const ebStartLocal = eb?.start?.local || "";
      const ebLoc =
        eb?.venue?.address?.localized_address_display ||
        (eb?.online_event ? "Online" : "");
      const ebImg = eb?.logo?.url || "";
      const ebOrg = eb?.organizer?.name || "";
      const ebCatName = eb?.category?.name || "";

      setTitle(ebTitle);
      setDescription(ebDesc);
      if (ebStartLocal) {
        setDate(ebStartLocal.slice(0, 10));
        setTime(ebStartLocal.slice(11, 16));
      }
      setLocation(ebLoc);
      setRemoteImageUrl(ebImg);
      setImageFile(null);

      setExternalSource("eventbrite");
      setExternalId(id);
      setExternalUrl(eb?.url || `https://www.eventbrite.com/e/${id}`);
      setExternalOrganizer(ebOrg);
      setExternalIsFree(Boolean(eb?.is_free));

      const resolved = resolveCategoryIdFromName(ebCatName, categories);
      if (resolved) setCategoryId(resolved);
    } catch (e) {
      console.error(e);
      setErrorMsg(`Import failed: ${e.message || String(e)}`);
    } finally {
      setImporting(false);
    }
  }

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

    const finalPrice =
      (price && price.trim()) || (externalIsFree ? "Free" : "Free");

    const payload = {
      title,
      description,
      location,
      date_time: dateTime,
      price: finalPrice,
      seats: parseInt(seats),
      seats_left: parseInt(seats),
      created_by: user.id,
      image_url,
      category_id: categoryId,
      external_source: externalSource || null,
      external_id: externalId || null,
      external_url: externalUrl || null,
      external_organizer: externalOrganizer || null,
      external_is_free: externalIsFree,
    };

    const { error } = await supabase.from("events").insert([payload]);
    setLoading(false);

    if (error) {
      console.error("Error creating event:", error.message);
      setErrorMsg("Failed to create event: " + error.message);
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setTime("12:30");
      setPrice("");
      setSeats("");
      setImageFile(null);
      setRemoteImageUrl("");
      setCategoryId("");
      setExternalSource("");
      setExternalId("");
      setExternalUrl("");
      setExternalOrganizer("");
      setExternalIsFree(null);
      setImportInput("");
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

      {/* Import from Eventbrite */}
      <div className="rounded border p-4 bg-gray-50">
        <label className="block text-sm font-medium mb-2">
          Import from Eventbrite
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Paste Eventbrite URL or numeric ID"
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            className="flex-1 border px-3 py-2 rounded"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>

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

      {/* Price (blank = Free) */}
      <input
        type="text"
        placeholder="Price (leave blank for Free)"
        className="w-full border px-4 py-2 rounded"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      {/* Seats */}
      <input
        type="number"
        placeholder="Number of seats"
        className="w-full border px-4 py-2 rounded"
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
      />

      {/* Image picker + optional remote URL */}
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <div>
          <label className="block text-sm font-medium mb-1">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full"
            onChange={(e) => {
              setImageFile(e.target.files[0]);
              // If user selects a file, ignore remote URL
              if (remoteImageUrl) setRemoteImageUrl("");
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            If you upload a file, it will override any imported image URL.
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

      {/* Preview */}
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
