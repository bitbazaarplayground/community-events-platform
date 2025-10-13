// src/pages/MyEvents.jsx
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function MyEvents() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("user"); // default assume user
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      // ✅ Get current user
      const { data: udata } = await supabase.auth.getUser();
      const u = udata?.user;
      if (!u) {
        setUser(null);
        setEvents([]);
        setLoading(false);
        return;
      }

      setUser(u);

      // ✅ Get profile role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();

      const userRole = profile?.role || "user";
      setRole(userRole);

      let data, error;

      if (userRole === "admin") {
        ({ data, error } = await supabase
          .from("events")
          .select("*, categories(name)")
          .eq("created_by", u.id)
          .order("date_time", { ascending: true }));
      } else {
        // 🔹 User → events they signed up for
        ({ data, error } = await supabase
          .from("signups")
          .select("event_id, events(*, categories(name))") // include categories + is_paid
          .eq("user_id", u.id)
          .order("events.date_time", { ascending: true }));

        if (data) data = data.map((row) => row.events);
      }

      if (error) {
        console.error("Error fetching events:", error.message);
        if (active) setEvents([]);
      } else if (active) {
        setEvents(data || []);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-gray-600">Please log in to view your events.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold mb-6">My Events</h2>

      {loading ? (
        <p className="text-gray-600">Loading your events…</p>
      ) : events.length === 0 ? (
        <p className="text-gray-600">
          {role === "admin"
            ? "You haven’t created any events yet."
            : "You haven’t signed up for any events yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              id={ev.id}
              title={ev.title}
              date={ev.date_time}
              price={ev.price}
              is_paid={ev.is_paid}
              location={ev.location}
              description={ev.description}
              category={ev.categories?.name}
              seats_left={ev.seats_left}
              image_url={ev.image_url}
              creatorId={ev.created_by}
            />
          ))}
        </div>
      )}
    </div>
  );
}
