// src/components/EventCard.jsx
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { signUpForEvent } from "../lib/signups.js";
import { supabase } from "../supabaseClient.js";

const FALLBACK_IMAGE = "https://placehold.co/600x360?text=Event";

export default function EventCard({
  id,
  title,
  date,
  price,
  location,
  description,
  category,
  seats_left,
  image_url,
  creatorId,
  external_source,
  external_url,
  external_organizer,
}) {
  const [creator, setCreator] = useState(null);
  const [signing, setSigning] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  // === Load if already saved ===
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !id) return;

      const { data } = await supabase
        .from("saved_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", id)
        .maybeSingle();

      setSaved(!!data);
    })();
  }, [id]);

  // === Fetch creator (local only) ===
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
      if (!error) setCreator(data || null);
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
    ? external_organizer ?? "Ticketmaster"
    : localDisplayName;

  // === Handle sign up (local events only) ===
  async function handleSignUp() {
    setMsg("");
    if (!id) return;
    setSigning(true);
    try {
      const res = await signUpForEvent(id);
      if (res.ok && res.reason === "signed") {
        setMsg("✅ Thank you for booking! Please check My Events.");
      } else if (res.ok && res.reason === "already_signed") {
        setMsg("ℹ️ You’re already signed up.");
      } else if (!res.ok && res.reason === "no_seats") {
        setMsg("❌ Sorry, this event is full.");
      } else {
        setMsg("⚠️ Couldn’t sign you up. Please try again.");
      }
    } catch (e) {
      setMsg(`⚠️ ${e.message || "Sign-up failed"}`);
    } finally {
      setSigning(false);
    }
  }

  // === Handle save / unsave ===
  async function handleToggleSave() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMsg("⚠️ Please log in to save events.");
      return;
    }

    if (saved) {
      await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", id);
      setSaved(false);
    } else {
      const insertData = {
        user_id: user.id,
        event_id: id,
        source: external_source || "local",
        title: title || "Untitled Event",
        location: location || "",
        image_url: image_url || FALLBACK_IMAGE,
        external_url: external_url || null,
      };

      const { error } = await supabase.from("saved_events").insert(insertData);
      if (error) {
        console.error("Error saving event:", error.message);
        setMsg("⚠️ Couldn’t save event.");
      } else {
        setSaved(true);
      }
    }
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 flex flex-col">
      {/* Media */}
      <div className="relative">
        <img
          src={image_url || FALLBACK_IMAGE}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          alt={title || "Event image"}
          className="h-48 w-full object-cover rounded-t-xl"
        />

        {/* Category (local only) */}
        {category && !external_source && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 shadow">
            {category}
          </span>
        )}

        {/* Heart */}
        <button
          onClick={handleToggleSave}
          className="absolute top-3 right-3"
          aria-label={saved ? "Remove from Saved Events" : "Save Event"}
        >
          {saved ? (
            <HeartSolid className="h-6 w-6 text-red-500" />
          ) : (
            <HeartOutline className="h-6 w-6 text-red-500 hover:text-red-500" />
          )}
        </button>
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

        {typeof seats_left === "number" && !external_source && (
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
          {external_source === "ticketmaster" && external_url ? (
            <a
              href={external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-full text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition"
            >
              Buy on Ticketmaster
            </a>
          ) : (
            <button
              type="button"
              onClick={handleSignUp}
              disabled={signing || seats_left === 0}
              className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {seats_left === 0
                ? "Sold out"
                : signing
                ? "Signing you up…"
                : isFree
                ? "Join Free"
                : `Sign Up (${price})`}
            </button>
          )}
          {msg && (
            <p className="text-xs mt-2 text-gray-600" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
