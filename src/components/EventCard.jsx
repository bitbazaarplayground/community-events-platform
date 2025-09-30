// src/components/EventCard.jsx

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventCard({
  // Common fields (local or external)
  id,
  title,
  date, // ISO string
  price,
  location,
  description,
  category, // string (e.g., from categories.name)
  seats_left,
  image_url,

  // Local-only
  creatorId, // events.created_by (UUID)

  // External (Ticketmaster)
  external_source, //  "ticketmaster" | null
  external_url, // external event link
  external_organizer, // organizer name (if provided)
}) {
  if (import.meta.env.DEV) {
    console.log("🖼️ Rendering EventCard:", {
      id,
      title,
      date,
      category,
      external_source,
    });
  }

  const [creator, setCreator] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchCreator = async () => {
      if (!creatorId) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, avatar_url")
        .eq("id", creatorId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Error fetching creator:", error.message);
      } else {
        setCreator(data || null);
      }
    };

    fetchCreator();
    return () => {
      active = false;
    };
  }, [creatorId]);

  const isFree =
    price == null ||
    String(price).trim() === "" ||
    String(price).toLowerCase() === "free";

  const localDisplayName =
    creator?.first_name || creator?.last_name
      ? `${creator?.first_name ?? ""} ${creator?.last_name ?? ""}`.trim()
      : creator?.email ?? "";

  const organizer = external_source
    ? external_organizer ?? ""
    : localDisplayName;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 flex flex-col">
      {/* Media */}
      <div className="relative">
        <img
          src={image_url || "https://via.placeholder.com/400x250"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "https://via.placeholder.com/400x250";
          }}
          alt={title || "Event image"}
          className="h-48 w-full object-cover rounded-t-xl"
        />

        {category && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 shadow">
            {category}
          </span>
        )}

        {isFree && !external_source && (
          <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow bg-green-100 text-green-700">
            Free
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {title}
        </h3>

        <p className="text-sm text-gray-600 mb-1">
          {date ? new Date(date).toLocaleString() : ""}
        </p>

        {location && <p className="text-sm text-gray-600 mb-3">{location}</p>}

        {description && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">
            {description}
          </p>
        )}

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

        {organizer && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            {creator?.avatar_url && !external_source && (
              <img
                src={creator.avatar_url}
                alt={organizer}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span>
              Organized by{" "}
              <span className="font-semibold text-purple-600">{organizer}</span>
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          {external_source === "ticketmaster" && external_url && (
            <a
              href={external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-full text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition"
              aria-label="Buy on Ticketmaster"
            >
              Buy on Ticketmaster
            </a>
          )}

          {!external_source && (
            <button
              type="button"
              className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition"
              aria-label={isFree ? "Join Free" : `Buy Now for ${price}`}
            >
              {isFree ? "Join Free" : `Buy Now for ${price}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
