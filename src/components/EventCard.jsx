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

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition duration-200">
      {/* Image section */}
      <div
        className="h-40 bg-cover bg-center"
        style={{
          backgroundImage: `url(${
            image_url || "https://via.placeholder.com/400x200"
          })`,
        }}
      />

      {/* Content */}
      <div className="p-4 flex flex-col h-full">
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-1">
          {new Date(date).toLocaleString()}
        </p>
        {location && <p className="text-sm text-gray-600 mb-1">{location}</p>}

        {/* Event Type Badge */}
        {event_type && (
          <span className="inline-block bg-gray-200 text-sm px-2 py-1 rounded mb-2">
            {event_type.charAt(0).toUpperCase() + event_type.slice(1)}
          </span>
        )}

        {description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-3">
            {description}
          </p>
        )}

        <p className="text-sm text-gray-800 mb-2">{price || "Free"}</p>

        {/* Seats Info */}
        {typeof seats_left === "number" && (
          <p className="text-sm mb-2">
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
          <p className="text-xs text-gray-500 mt-auto">By {creatorEmail}</p>
        )}
      </div>
    </div>
  );
}
