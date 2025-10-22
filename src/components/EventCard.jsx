// src/components/EventCard.jsx
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaCalendar } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useBasket } from "../context/BasketContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import { buildGoogleCalendarUrl } from "../lib/calendar.js";
import { signUpForEvent } from "../lib/signups.js";
import "../styles/EventCard.css";
import { supabase } from "../supabaseClient.js";
import TicketModal from "./TicketModal.jsx";

const FALLBACK_IMAGE = "https://placehold.co/600x360?text=Event";

export default function EventCard({
  id,
  title,
  date,
  price,
  is_paid,
  location,
  description,
  category,
  seats_left,
  image_url,
  created_by,
  external_source,
  external_url,
  external_organizer,
  extraCount,
  extraDates, //TM
  extra_dates, //db
}) {
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [signing, setSigning] = useState(false);
  const [user, setUser] = useState(null);

  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  // Safety net
  extraDates = extraDates || [];
  // Extra dates
  const [showDates, setShowDates] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // Basket
  const { addToBasket } = useBasket();
  const { setBasketOpen } = useUI();
  const [showTicketModal, setShowTicketModal] = useState(false);

  const toggleDates = () => {
    setShowDates((prev) => !prev);
    if (!hasInteracted) setHasInteracted(true); // stop pulse after first click
  };

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
  // === Fetch current logged-in user ===
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

  // === Fetch creator (for local events only) ===
  useEffect(() => {
    let active = true;

    const fetchCreator = async () => {
      if (!created_by || external_source === "ticketmaster") return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, avatar_url, role, display_name")
        .eq("id", created_by)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching creator:", error.message);
        return;
      }

      if (active) {
        setCreator(data);
      }
    };

    fetchCreator();
    return () => {
      active = false;
    };
  }, [created_by, external_source]);

  useEffect(() => {
    const handleDateUpdate = (e) => {
      if (e.detail.id === id) {
        // Just update local date
        setMsg("");
        setShowDates(false);
        setHasInteracted(true);
        // re-render card date
        const newDate = e.detail.newDate;
        document.startViewTransition?.(() => {
          // small animation if browser supports it
          window.requestAnimationFrame(() => {
            const dateEl = document.querySelector(`#date-${id}`);
            if (dateEl) dateEl.textContent = new Date(newDate).toLocaleString();
          });
        }) || setTimeout(() => {}, 0);
      }
    };
    window.addEventListener("updateEventDate", handleDateUpdate);
    return () =>
      window.removeEventListener("updateEventDate", handleDateUpdate);
  }, [id]);

  //  Stripe checkout - disabled for now -> Export to own js file

  const handleCheckout = async ({ id, title, price, date, quantity, user }) => {
    const baseUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:8888"
        : window.location.origin;

    try {
      const response = await fetch(
        `${baseUrl}/.netlify/functions/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: id,
            title: title || "Untitled Event",
            price: Number(price) || 0,
            userEmail: user.email,
            eventDate: date || new Date().toISOString(),
            quantity,
          }),
        }
      );

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("⚠️ Payment failed to initialize.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("⚠️ Payment error. Please try again later.");
    }
  };

  // === Mask email for privacy ===
  function maskEmail(email = "") {
    const [name, domain] = email.split("@");
    if (!name || !domain) return "User";
    const maskedName =
      name.length > 2
        ? `${name[0]}${"*".repeat(name.length - 2)}${name.slice(-1)}`
        : name;
    return `${maskedName}@${domain}`;
  }

  // === Organizer display logic ===
  const organizer = external_source
    ? external_organizer ?? "Ticketmaster"
    : creator?.display_name
    ? creator.display_name
    : creator?.first_name && creator?.last_name
    ? `${creator.first_name} ${creator.last_name}`
    : maskEmail(creator?.email);

  // === Handle sign up ===
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

  // === Tooltip for Ticketmaster ===
  function TicketmasterButtonWithTooltip({
    title,
    date,
    location,
    external_url,
  }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [hideTimer, setHideTimer] = useState(null);

    const handleMouseEnter = () => {
      if (hideTimer) clearTimeout(hideTimer);
      setShowTooltip(true);
    };

    const handleMouseLeave = () => {
      const timer = setTimeout(() => setShowTooltip(false), 2000);
      setHideTimer(timer);
    };

    return (
      <div
        className="relative flex justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <a
          href={user ? external_url : "#"}
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              alert("Please sign in to buy tickets.");
            }
          }}
          target={user ? "_blank" : "_self"}
          rel="noreferrer"
          className="inline-block w-full text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition relative z-10"
        >
          Buy on Ticketmaster
        </a>

        {showTooltip && date && (
          <a
            href={buildGoogleCalendarUrl({
              title: title || "Event",
              startISO: date,
              endISO: new Date(
                new Date(date).getTime() + 60 * 60 * 1000
              ).toISOString(),
              details: external_url || "",
              location: location || "",
            })}
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                alert("Please sign in to add to calendar.");
              }
            }}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-full mb-2 px-3 py-1 text-xs bg-white border border-blue-200 rounded-md text-blue-600 shadow-md opacity-100 transform translate-y-0 transition-all duration-700 ease-out hover:bg-blue-50 flex items-center justify-center gap-1.5"
          >
            <FaCalendar className="w-3.5 h-3.5" />
            Add to Google Calendar
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-purple-100 flex flex-col h-full justify-between">
      {/* Image */}
      <div className="relative">
        <Link to={`/event/${id}`} className="block hover:opacity-90 transition">
          <img
            src={image_url || FALLBACK_IMAGE}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            alt={title || "Event image"}
            className="h-48 w-full object-cover rounded-t-xl"
          />
        </Link>

        {/* Category */}
        {category && !external_source && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 shadow">
            {category}
          </span>
        )}

        {/* Save */}
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

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          <Link
            to={`/event/${id}`}
            className="hover:text-purple-600 transition"
          >
            {title}
          </Link>
        </h3>

        {date && (
          <p id={`date-${id}`} className="text-sm text-gray-600 mb-1">
            {new Date(date).toLocaleString()}
          </p>
        )}

        {/* Unified "+X more dates" for both Ticketmaster and local events */}
        {((external_source === "ticketmaster" && extraCount > 0) ||
          (Array.isArray(extra_dates) && extra_dates.length > 0)) && (
          <div className="mb-2">
            <button
              type="button"
              onClick={toggleDates}
              title="Click to view more dates"
              className={`text-sm font-semibold hover:underline transition flex items-center gap-1 ${
                showDates || hasInteracted ? "text-purple-600" : "pulse-text"
              }`}
            >
              {showDates ? (
                <>
                  Hide additional dates <span className="text-xs">▲</span>
                </>
              ) : (
                <>
                  +
                  {external_source === "ticketmaster"
                    ? extraCount
                    : extra_dates.length}{" "}
                  more date
                  {(external_source === "ticketmaster"
                    ? extraCount
                    : extra_dates.length) > 1
                    ? "s"
                    : ""}{" "}
                  available <span className="text-xs">▼</span>
                </>
              )}
            </button>

            {showDates && (
              <ul className="mt-2 text-sm text-gray-700 space-y-1 animate-fade-in">
                {(external_source === "ticketmaster"
                  ? extraDates
                  : extra_dates
                )?.map((d, idx) => (
                  <li key={idx} className="ml-2">
                    {external_source === "ticketmaster" ? (
                      <a
                        href={external_url || "#"}
                        target={external_url ? "_blank" : "_self"}
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition"
                      >
                        <span role="img" aria-label="calendar">
                          📅
                        </span>
                        <span>
                          {new Date(d).toLocaleDateString()}{" "}
                          {new Date(d).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          setShowDates(false);
                          setMsg("");
                          const newDate = new Date(d).toISOString();
                          window.dispatchEvent(
                            new CustomEvent("updateEventDate", {
                              detail: { id, newDate },
                            })
                          );
                        }}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:underline transition"
                      >
                        <span role="img" aria-label="calendar">
                          📅
                        </span>
                        <span>
                          {new Date(d).toLocaleDateString()}{" "}
                          {new Date(d).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
        {/* Organizer info */}
        {(creator || external_source) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            {/* Avatar for local events */}
            {creator?.avatar_url && !external_source && (
              <img
                src={creator.avatar_url}
                alt={
                  creator?.display_name || creator?.first_name || "Organizer"
                }
                loading="lazy"
                className="w-5 h-5 rounded-full object-cover"
              />
            )}

            <span className="flex items-center gap-1">
              Organized by{" "}
              {external_source === "ticketmaster" ? (
                <span className="font-semibold text-purple-600 flex items-center gap-1">
                  {external_organizer?.trim()
                    ? external_organizer
                    : "Ticketmaster Official"}
                </span>
              ) : creator ? (
                <span className="font-semibold text-purple-600 flex items-center gap-1">
                  {/* Display name > full name > masked email */}
                  {creator.display_name?.trim()
                    ? creator.display_name
                    : creator.first_name && creator.last_name
                    ? `${creator.first_name} ${creator.last_name}`
                    : creator.email
                    ? maskEmail(creator.email)
                    : "Unknown Organizer"}

                  {creator.role === "admin" && (
                    <CheckCircleIcon
                      className="w-3.5 h-3.5 text-green-500"
                      title="Verified Organizer"
                    />
                  )}
                </span>
              ) : (
                <span className="font-semibold text-purple-600">
                  Unknown Organizer
                </span>
              )}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-auto">
          {external_source === "ticketmaster" && external_url ? (
            <TicketmasterButtonWithTooltip
              title={title}
              date={date}
              location={location}
              external_url={external_url}
            />
          ) : user?.id &&
            String(user.id).trim() === String(created_by).trim() ? (
            <div className="text-center">
              <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                Your Event
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  setMsg("");
                  const { data } = await supabase.auth.getUser();
                  const user = data?.user;

                  if (!user) {
                    alert("Please sign in to purchase tickets.");
                    window.location.href = "/auth";
                    return;
                  }

                  if (is_paid && price > 0) {
                    setShowTicketModal(true);
                  } else {
                    await handleSignUp();
                  }
                }}
                disabled={signing || seats_left === 0}
                className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {seats_left === 0
                  ? "Sold out"
                  : signing
                  ? "Signing you up…"
                  : is_paid && price > 0
                  ? `Add To Basket £${price}`
                  : "Join Free"}
              </button>

              {/* 🎟 Ticket Quantity Modal */}
              <TicketModal
                isOpen={showTicketModal}
                onClose={() => setShowTicketModal(false)}
                onConfirm={(quantity) => {
                  addToBasket(
                    {
                      id,
                      title,
                      price,
                      date,
                      image_url: image_url || FALLBACK_IMAGE,
                      location,
                      is_paid,
                    },
                    quantity
                  );
                  setShowTicketModal(false);
                  setMsg(
                    `Added ${quantity} ticket${
                      quantity > 1 ? "s" : ""
                    } to your basket!`
                  );
                }}
              />

              {/* Animated success message */}
              <AnimatePresence mode="wait">
                {msg && (
                  <motion.p
                    key={msg}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs mt-2 text-gray-600 text-center"
                    aria-live="polite"
                  >
                    {msg}
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
