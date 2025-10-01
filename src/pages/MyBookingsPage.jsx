// src/pages/MyBookingsPage.jsx
import { useEffect, useState } from "react";
import { buildGoogleCalendarUrl } from "../lib/calendar.js";
import { supabase } from "../supabaseClient.js";

const PLACEHOLDER = "/img/event-placeholder.jpg";
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

export default function MyBookingsPage() {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: udata } = await supabase.auth.getUser();
      const u = udata?.user || null;
      if (!active) return;
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("signups")
        .select(
          `
          event:events (
            id, title, description, location, date_time, price, image_url,
            categories(name)
          )
        `
        )
        .eq("user_id", u.id);

      if (error) {
        console.error("Load signups error:", error.message);
        setRows([]);
      } else {
        const now = Date.now();
        const events = (data || [])
          .map((r) => r.event)
          .filter(Boolean)
          .sort((a, b) => {
            const ta = a.date_time ? new Date(a.date_time).getTime() : 0;
            const tb = b.date_time ? new Date(b.date_time).getTime() : 0;
            return ta - tb;
          });

        // group: upcoming first, then past
        const upcoming = events.filter(
          (ev) => new Date(ev.date_time).getTime() >= now
        );
        const past = events.filter(
          (ev) => new Date(ev.date_time).getTime() < now
        );
        setRows([
          { label: "Upcoming", list: upcoming },
          { label: "Past", list: past },
        ]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">My Events</h1>
        <p className="text-gray-600">Please sign in to view your events.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Events</h1>

      {loading ? (
        <p className="text-gray-600">Loading your bookings…</p>
      ) : rows.every((g) => g.list.length === 0) ? (
        <p className="text-gray-600">No bookings yet.</p>
      ) : (
        rows.map((group) => (
          <div key={group.label} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{group.label}</h2>
            {group.list.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No {group.label.toLowerCase()} events.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.list.map((ev) => {
                  const startISO = ev.date_time;
                  const endISO = startISO
                    ? new Date(
                        new Date(startISO).getTime() + 60 * 60 * 1000
                      ).toISOString()
                    : null;
                  const gcalHref =
                    startISO && endISO
                      ? buildGoogleCalendarUrl({
                          title: ev.title,
                          startISO,
                          endISO,
                          details: ev.description || "",
                          location: ev.location || "",
                        })
                      : null;

                  return (
                    <div
                      key={ev.id}
                      className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex flex-col"
                    >
                      <img
                        src={ev.image_url || PLACEHOLDER}
                        alt={ev.title}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = PLACEHOLDER;
                        }}
                      />
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {fmt(ev.date_time)}
                        </p>
                        {ev.location && (
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {ev.location}
                          </p>
                        )}
                        <div className="mt-auto pt-3 flex flex-wrap gap-2">
                          {gcalHref && (
                            <a
                              href={gcalHref}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs inline-block px-2 py-1 border border-green-600 text-green-700 rounded hover:bg-green-50"
                            >
                              Add to Google Calendar
                            </a>
                          )}
                          {/* Optional: a "Cancel signup" later */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
