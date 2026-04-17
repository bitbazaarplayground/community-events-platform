// src/pages/PastEvents.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function PastEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const currentUser = data?.user || null;
      setUser(currentUser);

      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      const { data: payments, error } = await supabase
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
        .eq("user_email", currentUser.email)
        .order("created_at", { ascending: false });

      if (error) {
        setErr(error.message || "Failed to load past events.");
        setLoading(false);
        return;
      }

      const normalized = (payments || [])
        .filter((r) => r.events)
        .map((r) => ({
          ...r.events,
          quantity: r.quantity || 1,
          amount: r.amount || 0,
          created_at: r.created_at,
          category: r.events.categories?.name || null,
        }));

      setRows(normalized);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return rows.filter((ev) => {
      const t = ev.date_time ? new Date(ev.date_time).getTime() : 0;
      return t < now;
    });
  }, [rows]);

  if (loading) return <p className="p-6 text-gray-600">Loading past events…</p>;

  if (!user) {
    return (
      <p className="p-6 text-gray-600">Please sign in to view past events.</p>
    );
  }

  if (err) {
    return <p className="p-6 text-red-600">{err}</p>;
  }

  if (pastEvents.length === 0) {
    return (
      <p className="p-6 text-gray-600">You don’t have any past events yet.</p>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Past Events</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pastEvents.map((ev) => (
          <EventCard key={`${ev.id}-${ev.created_at}`} {...ev} hideJoinButton />
        ))}
      </div>
    </div>
  );
}
