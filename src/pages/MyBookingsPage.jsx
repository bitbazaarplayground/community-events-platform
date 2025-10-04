// src/pages/MyBookingsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildGoogleCalendarUrl } from "../lib/calendar.js";
import { supabase } from "../supabaseClient.js";

const PAGE_SIZE = 12;
const EVENT_PLACEHOLDER = "/img/concertCrowd.jpeg";
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]); // normalized events
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // upcoming | past
  // const [tab, setTab] = useState("upcoming");

  // Load session
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const u = data?.user || null;
      setUser(u);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch a page of signups (joined with events)
  async function fetchPage(nextPage = 0, reset = false) {
    if (!user) return;
    setLoading(true);
    setErr("");

    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("signups")
      .select(
        `
        event_id,
        created_at,
        event:events (
          id, title, description, location, date_time, price, image_url, categories(name)
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setErr(error.message || "Failed to load bookings.");
      setLoading(false);
      return;
    }

    const normalized = (data || [])
      .map((r) => r.event)
      .filter(Boolean)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        date_time: ev.date_time,
        location: ev.location,
        description: ev.description,
        image_url: ev.image_url,
        category: ev.categories?.name || null,
      }));

    setRows((prev) => (reset ? normalized : [...prev, ...normalized]));
    setPage(nextPage + 1);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
  }

  // Initial load when user is ready
  useEffect(() => {
    if (!user) return;
    // reset state
    setRows([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((ev) => {
        const t = ev.date_time ? new Date(ev.date_time).getTime() : 0;
        return tab === "upcoming" ? t >= now : t < now;
      })
      .sort((a, b) => {
        const ta = a.date_time ? new Date(a.date_time).getTime() : 0;
        const tb = b.date_time ? new Date(b.date_time).getTime() : 0;
        return tab === "upcoming" ? ta - tb : tb - ta;
      });
  }, [rows, tab]);

  async function cancelSignup(eventId) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("signups")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);
      if (error) throw error;

      // Remove locally
      setRows((prev) => prev.filter((r) => r.id !== eventId));
    } catch (e) {
      alert("Could not cancel: " + (e?.message ?? e));
    }
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-gray-600">Please sign in to view your bookings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Booked Events</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      {/* <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded-full border ${
            tab === "upcoming"
              ? "bg-purple-600 text-white border-purple-600"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming
        </button>
        <button
          className={`px-3 py-1 rounded-full border ${
            tab === "past"
              ? "bg-purple-600 text-white border-purple-600"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setTab("past")}
        >
          Past
        </button>
      </div> */}

      {err && <p className="text-red-600 mb-3">{err}</p>}

      {/* Grid */}
      {filtered.length === 0 && !loading ? (
        <p className="text-gray-600">
          {tab === "upcoming"
            ? "You have no upcoming bookings."
            : "You have no past bookings yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ev) => {
            const startISO = ev.date_time;
            const endISO = startISO
              ? new Date(
                  new Date(startISO).getTime() + 60 * 60 * 1000
                ).toISOString()
              : null;
            const gcal = startISO
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
                  src={ev.image_url || EVENT_PLACEHOLDER}
                  alt={ev.title}
                  className="h-40 w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = EVENT_PLACEHOLDER;
                  }}
                />
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold line-clamp-1">{ev.title}</h3>
                  <p className="text-sm text-gray-600">{fmt(ev.date_time)}</p>
                  {ev.location && (
                    <p className="text-xs text-gray-500">{ev.location}</p>
                  )}

                  <div className="mt-auto flex gap-2 pt-3">
                    {gcal && (
                      <a
                        href={gcal}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 text-sm border border-green-600 text-green-700 rounded hover:bg-green-50"
                      >
                        Add to Google Calendar
                      </a>
                    )}
                    {tab === "upcoming" && (
                      <button
                        onClick={() => cancelSignup(ev.id)}
                        className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pager */}
      <div className="mt-8">
        {hasMore && (
          <button
            disabled={loading}
            onClick={() => fetchPage(page)}
            className="px-5 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
