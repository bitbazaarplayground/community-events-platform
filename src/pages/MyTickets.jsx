// src/pages/MyTickets.jsx
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildGoogleCalendarUrl } from "../lib/calendar.js";
import { supabase } from "../supabaseClient.js";

async function downloadTicket(event, user) {
  const doc = new jsPDF();

  const qrData = `EVENT:${event.id}|USER:${user.email}|REF:${event.id}-${user.email}`;
  const qrImage = await QRCode.toDataURL(qrData, { width: 128 });

  doc.setFontSize(18);
  doc.text("🎟 Event Ticket", 20, 20);

  doc.setFontSize(12);
  doc.text(`Event: ${event.title}`, 20, 40);
  doc.text(`Date: ${new Date(event.date_time).toLocaleString()}`, 20, 50);
  if (event.location) doc.text(`Location: ${event.location}`, 20, 60);
  doc.text(`Attendee: ${user.email}`, 20, 70);
  doc.text(`Tickets: ${event.quantity || 1}`, 20, 80);

  doc.addImage(qrImage, "PNG", 20, 95, 50, 50);

  doc.setFontSize(10);
  doc.text("Thank you for your purchase!", 20, 155);
  doc.text("Please show this QR code at the event entrance.", 20, 162);

  doc.save(`ticket_${event.title.replace(/\s+/g, "_")}.pdf`);
}

const PAGE_SIZE = 12;
const EVENT_PLACEHOLDER = "/img/concertCrowd.jpeg";
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

export default function MyTickets() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("upcoming");

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

  // ✅ Updated: Fetch from payments, ensure `quantity` and `events` join are correct
  async function fetchPage(nextPage = 0, reset = false) {
    if (!user) return;
    setLoading(true);
    setErr("");

    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("payments")
      .select(
        `
          event_id,
          amount,
          quantity,
          created_at,
          events (
            id,
            title,
            description,
            location,
            date_time,
            price,
            image_url,
            categories(name)
          )
        `
      )
      .eq("user_email", user.email)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setErr(error.message || "Failed to load bookings.");
      setLoading(false);
      return;
    }

    // ✅ Fix: use r.events (plural), not r.event
    const normalized = (data || [])
      .filter((r) => r.events)
      .map((r) => ({
        id: r.events.id,
        title: r.events.title,
        date_time: r.events.date_time,
        location: r.events.location,
        description: r.events.description,
        image_url: r.events.image_url,
        category: r.events.categories?.name || null,
        quantity: r.quantity || 1,
        amount: r.amount || 0,
      }));

    setRows((prev) => (reset ? normalized : [...prev, ...normalized]));
    setPage(nextPage + 1);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    setRows([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
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
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>

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
                  <p className="text-sm text-gray-600">
                    🎟️ Tickets:{" "}
                    <span className="font-semibold">{ev.quantity}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    💷 Total Paid:{" "}
                    <span className="font-semibold">
                      £{(ev.amount || 0).toFixed(2)}
                    </span>
                  </p>

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
                    <button
                      onClick={() => downloadTicket(ev, user)}
                      className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                    >
                      Download Ticket
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            disabled={loading}
            onClick={() => fetchPage(page)}
            className="px-5 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
