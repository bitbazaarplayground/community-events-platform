import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function MyEvents() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("user");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ KPI dashboard state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalAttendees: 0,
    topEvent: null,
    eventMetrics: {},
    attendees: [],
  });

  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  // ================================================================
  // 🔹 STEP 1 — Fetch current user + their events
  // ================================================================
  useEffect(() => {
    let active = true;
    async function loadUserEvents() {
      setLoading(true);
      try {
        const { data: udata } = await supabase.auth.getUser();
        const u = udata?.user;

        if (!u) {
          setUser(null);
          setEvents([]);
          return;
        }
        setUser(u);

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();

        const userRole = profile?.role || "user";
        setRole(userRole);

        if (userRole !== "admin") {
          setEvents([]);
          return;
        }

        const { data, error } = await supabase
          .from("events")
          .select(
            "id, title, date_time, price, image_url, location, categories(name)"
          )
          .eq("created_by", u.id)
          .order("date_time", { ascending: false });

        if (error) throw error;
        if (active) setEvents(data || []);
      } catch (err) {
        console.error("❌ Error loading events:", err.message);
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUserEvents();
    return () => {
      active = false;
    };
  }, []);

  // ================================================================
  // 🔹 STEP 2 — Fetch KPI metrics
  // ================================================================
  useEffect(() => {
    if (!user || role !== "admin") return;
    fetchKPIData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, selectedEventId]);

  async function fetchKPIData() {
    setLoading(true);
    try {
      // Fetch only payments for events created by this admin
      let query = supabase
        .from("payments")
        .select(
          "event_id, amount, event_title, created_at, events!inner(created_by)"
        )
        .eq("events.created_by", user.id);

      if (selectedEventId) query = query.eq("event_id", selectedEventId);

      const { data, error } = await query;
      if (error) throw error;

      // 🧮 Compute KPIs
      const grouped = {};
      let totalRevenue = 0;
      let totalAttendees = 0;

      data.forEach((p) => {
        grouped[p.event_id] = grouped[p.event_id] || {
          title: p.event_title,
          revenue: 0,
          attendees: 0,
        };
        grouped[p.event_id].revenue += p.amount;
        grouped[p.event_id].attendees += 1;
        totalRevenue += p.amount;
        totalAttendees += 1;
      });

      // 🗓️ Group revenue per day (for single-event line chart)
      Object.keys(grouped).forEach((eventId) => {
        const eventPayments = data.filter((p) => p.event_id === eventId);
        const dailyMap = {};

        eventPayments.forEach((p) => {
          const rawDate = p.created_at || null;
          if (!rawDate) return;

          const dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) return;

          const day = dateObj.toISOString().split("T")[0];
          dailyMap[day] = (dailyMap[day] || 0) + p.amount;
        });

        grouped[eventId].daily = Object.entries(dailyMap).map(
          ([date, revenue]) => ({
            date,
            revenue,
          })
        );
      });

      const topEvent =
        Object.values(grouped).sort((a, b) => b.revenue - a.revenue)[0] || null;

      const newStats = {
        totalRevenue,
        totalAttendees,
        topEvent,
        eventMetrics: grouped,
        attendees: [],
      };

      // 🟣 Fetch attendees via fallback (join by email)
      if (selectedEventId) {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from("payments")
          .select("user_email, amount, created_at")
          .eq("event_id", selectedEventId);

        if (!attendeesError && attendeesData?.length) {
          const emails = attendeesData.map((a) => a.user_email);
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("email, first_name, last_name")
            .in("email", emails);

          const merged = attendeesData.map((p) => {
            const profile = profiles?.find((u) => u.email === p.user_email);
            return {
              email: p.user_email,
              amount: Number(p.amount) || 0,
              created_at: p.created_at,
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
            };
          });

          newStats.attendees = merged;
        }
      }

      setStats(newStats);
    } catch (err) {
      console.error("❌ Error fetching KPI data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================================================================
  // 🔹 STEP 3 — Sorting logic for attendee table
  // ================================================================
  const sortedAttendees = useMemo(() => {
    if (!stats.attendees?.length) return [];
    const sorted = [...stats.attendees];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      if (key === "name") {
        const nameA = `${a.first_name || ""} ${a.last_name || ""}`
          .trim()
          .toLowerCase();
        const nameB = `${b.first_name || ""} ${b.last_name || ""}`
          .trim()
          .toLowerCase();
        return direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      if (key === "amount") {
        return direction === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      if (key === "created_at") {
        return direction === "asc"
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });
    return sorted;
  }, [stats.attendees, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // ================================================================
  // 🔹 STEP 4 — UI Rendering
  // ================================================================
  if (!user)
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-gray-600">
        Please log in to view your events.
      </div>
    );

  if (role !== "admin")
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-gray-600">
        Only admins can view analytics.
      </div>
    );
  // ================================================================
  // 🔹 STEP 5 — CSV Export for attendees
  // ================================================================
  function downloadCSV() {
    if (!stats.attendees?.length) return;

    const headers = ["Name", "Email", "Amount (£)", "Purchase Date"];
    const rows = stats.attendees.map((a) => {
      const fullName =
        a.first_name || a.last_name
          ? `${a.first_name || ""} ${a.last_name || ""}`.trim()
          : "N/A";
      const formattedDate = a.created_at
        ? new Date(a.created_at).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      return [
        `"${fullName}"`,
        `"${a.email}"`,
        `"£${a.amount.toFixed(2)}"`,
        `"${formattedDate}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendees_${selectedEventId || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-purple-700 mb-8">
        📊 Event Performance Dashboard
      </h2>

      {/* 🔍 Event Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select an event to view specific stats
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      {/* 📈 KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm text-center">
          <h3 className="text-gray-500 text-sm mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-purple-600">
            £
            {(selectedEventId
              ? stats.eventMetrics[selectedEventId]?.revenue || 0
              : stats.totalRevenue
            ).toFixed(2)}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg shadow-sm text-center">
          <h3 className="text-gray-500 text-sm mb-1">Total Attendees</h3>
          <p className="text-2xl font-bold text-purple-600">
            {selectedEventId
              ? stats.eventMetrics[selectedEventId]?.attendees || 0
              : stats.totalAttendees}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg shadow-sm text-center">
          <h3 className="text-gray-500 text-sm mb-1">Top Performing Event</h3>
          <p className="text-lg font-semibold text-purple-600">
            {stats.topEvent?.title || "—"}
          </p>
        </div>
      </div>

      {/* 📊 Charts Section */}
      <div className="my-12 border-t border-gray-200 pt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Event Performance Overview
        </h3>
        {Object.keys(stats.eventMetrics).length === 0 ? (
          <p className="text-gray-500 text-center italic">
            No payment data available yet.
          </p>
        ) : selectedEventId ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={stats.eventMetrics[selectedEventId]?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis
                stroke="#9333ea"
                tick={{ fill: "#6b7280" }}
                label={{
                  value: "Revenue (£)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#6b7280",
                }}
              />
              <Tooltip
                formatter={(v) => `£${v.toFixed(2)}`}
                labelFormatter={(d) => `Date: ${d}`}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#9333ea"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={Object.entries(stats.eventMetrics).map(([id, ev]) => ({
                name: ev.title,
                Revenue: ev.revenue,
                Attendees: ev.attendees,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#9333ea" />
              <YAxis yAxisId="right" orientation="right" stroke="#2563eb" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Revenue" fill="#9333ea" />
              <Bar yAxisId="right" dataKey="Attendees" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 👥 Registered Attendees List */}
      {selectedEventId && (
        <div className="mt-10 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-purple-700 mb-4">
            Registered Attendees ({sortedAttendees.length})
          </h4>

          {sortedAttendees.length > 0 ? (
            <>
              <table className="min-w-full border-t border-gray-200 text-sm text-gray-800 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("name")}
                    >
                      Name{" "}
                      {sortConfig.key === "name"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("amount")}
                    >
                      Amount (£){" "}
                      {sortConfig.key === "amount"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("created_at")}
                    >
                      Purchase Date{" "}
                      {sortConfig.key === "created_at"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttendees.map((a, idx) => {
                    const fullName =
                      a.first_name || a.last_name
                        ? `${a.first_name || ""} ${a.last_name || ""}`.trim()
                        : "N/A";
                    const formattedDate = a.created_at
                      ? new Date(a.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A";
                    return (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="py-2 px-3">{fullName}</td>
                        <td className="py-2 px-3">{a.email}</td>
                        <td className="py-2 px-3">£{a.amount.toFixed(2)}</td>
                        <td className="py-2 px-3">{formattedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ⬇️ Modern Download CSV button with tooltip */}
              <div className="flex justify-end">
                <div className="relative group">
                  <button
                    onClick={downloadCSV}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
                  >
                    Download CSV
                  </button>
                  <span className="absolute -top-8 right-0 scale-0 group-hover:scale-100 transition-all bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                    Download attendee list as CSV
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-500 italic mb-4">
                No attendees have booked this event yet.
              </p>

              {/* 🟣 Disabled button with tooltip */}
              <div className="flex justify-end">
                <div className="relative group">
                  <button
                    disabled
                    className="bg-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg shadow-sm cursor-not-allowed"
                  >
                    ⬇️ Download CSV
                  </button>
                  <span className="absolute -top-8 right-0 scale-0 group-hover:scale-100 transition-all bg-gray-700 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                    No records to download
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 🎟️ Admin's Posted Events */}
      <h3 className="text-xl font-semibold mt-12 mb-4">Your Posted Events</h3>
      {loading ? (
        <p className="text-gray-600">Loading your events…</p>
      ) : events.length === 0 ? (
        <p className="text-gray-600">You haven’t created any events yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <EventCard key={ev.id} {...ev} />
          ))}
        </div>
      )}
    </div>
  );
}
