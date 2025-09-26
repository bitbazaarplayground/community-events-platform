// src/components/EventCard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventCard({
  title,
  date,
  price,
  location,
  description,
  event_type,
  seats_left,
  image_url,
  creatorId,
}) {
  const [creatorEmail, setCreatorEmail] = useState(null);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", creatorId)
        .single();

      if (error) {
        console.error("Error fetching creator:", error.message);
      } else {
        setCreatorEmail(data.email);
      }
    };

    fetchCreator();
  }, [creatorId]);
  console.log("Rendering EventCard:", title, "image_url:", image_url);
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition duration-200">
      <img
        src={image_url || "https://via.placeholder.com/400x200"}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://via.placeholder.com/400x200";
        }}
        alt={title}
        className="h-40 w-full object-cover"
      />

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-1">
          {new Date(date).toLocaleString()}
        </p>
        {location && <p className="text-sm text-gray-600 mb-1">{location}</p>}
        <p className="text-sm text-gray-800 mb-2">{price || "Free"}</p>

        {/* Event type */}
        {event_type && (
          <p className="text-sm text-gray-500 italic mb-2">
            Type: {event_type === "donation" ? "Donation-Based" : event_type}
          </p>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-700 line-clamp-3 mb-2">
            {description}
          </p>
        )}

        {/* Seats Info */}
        {typeof seats_left === "number" && (
          <p className="text-sm mb-1">
            <span className="font-semibold">{seats_left}</span>{" "}
            {seats_left === 1 ? "seat" : "seats"} left
            {seats_left <= 5 && seats_left > 0 && (
              <span className="ml-2 text-red-500 font-semibold">
                Selling fast!
              </span>
            )}
          </p>
        )}

        {/* Creator */}
        {creatorEmail && (
          <p className="text-xs text-gray-500 mt-2">By {creatorEmail}</p>
        )}
      </div>
    </div>
  );
}
