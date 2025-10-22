import { ShareIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBasket } from "../context/BasketContext.jsx";
import { supabase } from "../supabaseClient.js";

const FALLBACK_IMAGE = "https://placehold.co/600x360?text=Event";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const { addToBasket } = useBasket();
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);

  // === Fetch event data ===
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) console.error("❌ Error loading event:", error.message);
      else {
        setEvent(data);
        // Handle multiple or single date
        if (Array.isArray(data.extra_dates) && data.extra_dates.length > 0) {
          setSelectedDate(data.extra_dates[0]);
        } else {
          setSelectedDate(data.date);
        }
      }
    })();
  }, [id]);

  // === Fetch organizer profile ===
  useEffect(() => {
    if (!event?.created_by) return;

    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, display_name, avatar_url")
        .eq("id", event.created_by)
        .single();

      if (!error && data) setCreator(data);
    })();
  }, [event]);

  if (!event)
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
        Loading event details…
      </div>
    );

  const eventDate = selectedDate ? new Date(selectedDate) : null;
  const hasMultipleDates =
    Array.isArray(event.extra_dates) && event.extra_dates.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6 md:p-10"
    >
      {/* 🟣 Back button */}
      <button
        onClick={() => navigate("/browse")}
        className="mb-6 text-sm text-purple-600 hover:text-purple-800 transition font-medium flex items-center gap-2"
      >
        ← Back to Browse
      </button>

      {/* --- Top section: image + purchase box --- */}
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left: Event image */}
        <div>
          <img
            src={event.image_url || FALLBACK_IMAGE}
            alt={event.title}
            className="w-full h-80 object-cover rounded-2xl shadow-md"
          />
        </div>

        {/* Right: Purchase / Info box */}
        <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
          {/* Share Button */}
          <button
            onClick={() => {
              const shareData = {
                title: event.title,
                text: "Check out this event!",
                url: window.location.href,
              };

              if (navigator.share) {
                navigator.share(shareData).catch(console.error);
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("🔗 Event link copied to clipboard!");
              }
            }}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition"
            title="Share this event"
          >
            <ShareIcon className="w-4 h-4 text-white" />
            <span>Share</span>
          </button>

          <div>
            {/* Event Date */}
            <p className="text-sm text-gray-500">
              {eventDate
                ? `${eventDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })} • ${eventDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Date to be announced"}
            </p>

            {/* Location */}
            <p className="text-gray-700 mt-1 mb-4">{event.location}</p>

            {/* Multiple date selector */}
            {hasMultipleDates && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Select a date:
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                >
                  {event.extra_dates.map((d, i) => (
                    <option key={i} value={d}>
                      {new Date(d).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      –{" "}
                      {new Date(d).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <h2 className="text-xl font-semibold text-purple-700 mb-3">
              Tickets
            </h2>

            <p className="text-2xl font-bold text-gray-900 mb-4">
              GBP {Number(event.price).toFixed(2)}
            </p>

            {/* Quantity Selector */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1 border rounded-lg hover:bg-gray-100 text-lg"
              >
                −
              </button>
              <span className="text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-1 border rounded-lg hover:bg-gray-100 text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to basket button */}
          <button
            onClick={() => {
              if (!event || !selectedDate) {
                alert("⚠️ Please select a date before adding to basket.");
                return;
              }

              addToBasket(
                {
                  id: event.id,
                  title: event.title || "Untitled Event",
                  price: Number(event.price) || 0,
                  date: selectedDate,
                  image_url: event.image_url || FALLBACK_IMAGE,
                  location: event.location || "Unknown location",
                  is_paid: event.is_paid ?? true,
                },
                quantity
              );

              // Optional: show visual feedback
              alert(
                `🎟️ Added ${quantity} ticket${quantity > 1 ? "s" : ""} for “${
                  event.title
                }” to your basket!`
              );
            }}
            className="mt-auto w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all duration-150 shadow-md"
          >
            Add to Basket
          </button>
        </div>
      </div>

      {/* --- Bottom section: title + description --- */}
      <div className="mt-10 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.title}</h1>
        <p className="text-gray-700 leading-relaxed">
          {event.description || "No description available for this event."}
        </p>

        {/* Hosted by */}
        {creator && (
          <div className="mt-8 flex items-center gap-3 border-t border-gray-100 pt-4">
            <img
              src={creator.avatar_url || "https://placehold.co/50x50?text=👤"}
              alt={creator.display_name || "Organizer"}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm text-gray-500">Hosted by</p>
              <p className="font-semibold text-gray-900">
                {creator.display_name ||
                  `${creator.first_name || ""} ${
                    creator.last_name || ""
                  }`.trim() ||
                  "Organizer"}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
