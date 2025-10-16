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

  // 🟣 Line chart visibility toggles
  const [showRevenue, setShowRevenue] = useState(true);
  const [showTickets, setShowTickets] = useState(true);

  // View All Attendees
  // View All Attendees
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🧩 Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

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
            "id, title, date_time, price, image_url, location, created_by, categories(name)"
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
      // Fetch payments linked to this admin’s events
      let query = supabase
        .from("payments")
        .select(
          "event_id, amount, quantity, event_title, user_email, created_at, events!inner(created_by)"
        )
        .eq("events.created_by", user.id);

      if (selectedEventId) query = query.eq("event_id", selectedEventId);

      const { data, error } = await query;
      if (error) throw error;

      const grouped = {};
      let totalRevenue = 0;
      let totalTickets = 0;

      data.forEach((p) => {
        const q = Number(p.quantity) || 1;
        grouped[p.event_id] = grouped[p.event_id] || {
          title: p.event_title,
          revenue: 0,
          tickets: 0,
        };
        grouped[p.event_id].revenue += p.amount;
        grouped[p.event_id].tickets += q;
        totalRevenue += p.amount;
        totalTickets += q;
      });

      // 🗓️ Group revenue per day for selected event
      Object.keys(grouped).forEach((eventId) => {
        const eventPayments = data.filter((p) => p.event_id === eventId);
        const dailyMap = {};
        eventPayments.forEach((p) => {
          const rawDate = p.created_at;
          if (!rawDate) return;
          const day = new Date(rawDate).toISOString().split("T")[0];

          const qty = Number(p.quantity) || 1;
          dailyMap[day] = dailyMap[day] || { revenue: 0, tickets: 0 };
          dailyMap[day].revenue += p.amount;
          dailyMap[day].tickets += qty;
        });

        grouped[eventId].daily = Object.entries(dailyMap).map(
          ([date, values]) => ({
            date,
            revenue: values.revenue,
            tickets: values.tickets,
          })
        );
      });
      const topEvent =
        Object.values(grouped).sort((a, b) => b.revenue - a.revenue)[0] || null;

      // ✅ Build last 5 purchases (for “All Events” view)
      const lastPurchases = data
        .map((p) => ({
          event_title: p.event_title,
          email: p.user_email,
          amount: Number(p.amount) || 0,
          quantity: Number(p.quantity) || 1,
          created_at: p.created_at,
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // ✅ Build attendee list for selected event
      let attendees = [];
      if (selectedEventId) {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from("payments")
          .select("user_email, amount, quantity, created_at")
          .eq("event_id", selectedEventId);

        if (!attendeesError && attendeesData?.length) {
          const emails = attendeesData.map((a) => a.user_email);

          // fetch basic user info for those emails
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("email, first_name, last_name")
            .in("email", emails);

          // merge payments + profile data
          attendees = attendeesData.map((p) => {
            const profile = profiles?.find((u) => u.email === p.user_email);
            return {
              email: p.user_email,
              amount: Number(p.amount) || 0,
              quantity: p.quantity || 1,
              created_at: p.created_at,
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
            };
          });
        }
      }

      // ✅ Update full stats object
      setStats({
        totalRevenue,
        totalTickets,
        topEvent,
        eventMetrics: grouped,
        lastPurchases,
        attendees,
      });
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

  const filteredAttendees = useMemo(() => {
    if (!searchTerm.trim()) return sortedAttendees;
    const lower = searchTerm.toLowerCase();
    return sortedAttendees.filter(
      (a) =>
        a.email.toLowerCase().includes(lower) ||
        `${a.first_name || ""} ${a.last_name || ""}`
          .toLowerCase()
          .includes(lower)
    );
  }, [searchTerm, sortedAttendees]);

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
  // 🔹 STEP 5 — CSV Export Functions
  // ================================================================

  // 🟣 Download CSV for single event attendees
  function downloadCSV() {
    if (!stats.attendees?.length) return;

    const headers = ["Name", "Email", "Tickets", "Amount (£)", "Purchase Date"];
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
        `"${a.quantity || 1}"`,
        `"£${a.amount.toFixed(2)}"`,
        `"${formattedDate}"`,
      ].join(",");
    });

    // 🧮 Totals
    const totalTickets = stats.attendees.reduce(
      (sum, a) => sum + (a.quantity || 1),
      0
    );
    const totalRevenue = stats.attendees.reduce((sum, a) => sum + a.amount, 0);

    rows.push("");
    rows.push(
      `"Total Tickets: ${totalTickets}","Total Revenue: £${totalRevenue.toFixed(
        2
      )}"`
    );

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

  // 🟣 Download CSV for all events (admin summary)
  function downloadAllEventsCSV() {
    if (!stats.lastPurchases?.length) return;

    const headers = [
      "Event",
      "Email",
      "Tickets",
      "Amount (£)",
      "Purchase Date",
    ];
    const rows = stats.lastPurchases.map((p) =>
      [
        `"${p.event_title}"`,
        `"${p.email}"`,
        `"${p.quantity}"`,
        `"£${p.amount.toFixed(2)}"`,
        `"${new Date(p.created_at).toLocaleString("en-GB")}"`,
      ].join(",")
    );

    const totalTickets = stats.lastPurchases.reduce(
      (sum, p) => sum + (p.quantity || 1),
      0
    );
    const totalAmount = stats.lastPurchases.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    rows.push("");
    rows.push(`"Total Tickets","${totalTickets}"`);
    rows.push(`"Total Revenue","£${totalAmount.toFixed(2)}"`);

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "all_events_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  async function downloadModalCSV() {
    try {
      const isEventView = !!selectedEventId;
      const filename = isEventView
        ? "event_attendees.csv"
        : "all_purchases.csv";

      const data = isEventView ? sortedAttendees : stats.lastPurchases || [];

      if (!data.length) {
        alert("No records available for export.");
        return;
      }

      const headers = isEventView
        ? ["Name", "Email", "Tickets", "Amount (£)"]
        : ["Event", "Email", "Tickets", "Amount (£)"];

      const rows = data.map((item) =>
        isEventView
          ? [
              `"${item.first_name || ""} ${item.last_name || ""}"`,
              `"${item.email}"`,
              `"${item.quantity || 1}"`,
              `"£${item.amount.toFixed(2)}"`,
            ].join(",")
          : [
              `"${item.event_title}"`,
              `"${item.email}"`,
              `"${item.quantity || 1}"`,
              `"£${item.amount.toFixed(2)}"`,
            ].join(",")
      );

      // Totals summary
      const totalTickets = data.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const totalRevenue = data.reduce((sum, a) => sum + (a.amount || 0), 0);
      rows.push("");
      rows.push(`"TOTAL TICKETS","${totalTickets}"`);
      rows.push(`"TOTAL REVENUE","£${totalRevenue.toFixed(2)}"`);

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ CSV download error:", err);
    }
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
          <h3 className="text-gray-500 text-sm mb-1">Total Tickets Sold</h3>

          <p className="text-2xl font-bold text-purple-600">
            {selectedEventId
              ? stats.eventMetrics[selectedEventId]?.tickets || 0
              : stats.totalTickets}
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
          <>
            {/* 🟣 Toggle visibility controls */}
            <div className="flex justify-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showRevenue}
                  onChange={() => setShowRevenue((prev) => !prev)}
                  className="accent-purple-600"
                />
                <span>Show Revenue</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTickets}
                  onChange={() => setShowTickets((prev) => !prev)}
                  className="accent-blue-600"
                />
                <span>Show Tickets</span>
              </label>
            </div>
            <div className="bg-white shadow-md rounded-xl p-6 transition-all duration-300 hover:shadow-lg">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={stats.eventMetrics[selectedEventId]?.daily || []}
                >
                  <defs>
                    {/* 💜 Revenue gradient */}
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#9333ea" stopOpacity={0.5} />
                      <stop
                        offset="100%"
                        stopColor="#9333ea"
                        stopOpacity={0.1}
                      />
                    </linearGradient>

                    {/* 💙 Tickets gradient */}
                    <linearGradient
                      id="ticketsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9333ea"
                    tick={{ fill: "#6b7280" }}
                    label={{
                      value: "Revenue (£)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#6b7280",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#2563eb"
                    tick={{ fill: "#6b7280" }}
                    label={{
                      value: "Tickets Sold",
                      angle: 90,
                      position: "insideRight",
                      fill: "#6b7280",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    }}
                    labelStyle={{ color: "#6b7280", fontWeight: 500 }}
                    formatter={(value, name) => {
                      if (name === "revenue")
                        return [`£${value.toFixed(2)}`, "Revenue"];
                      if (name === "tickets") return [value, "Tickets Sold"];
                      return [value];
                    }}
                    labelFormatter={(d) => `📅 ${d}`}
                  />

                  <Legend verticalAlign="top" height={36} />

                  {showRevenue && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="url(#revenueGradient)"
                      strokeWidth={3}
                      fillOpacity={0.3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#9333ea" }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-in-out"
                    />
                  )}

                  {showTickets && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="tickets"
                      stroke="url(#ticketsGradient)"
                      strokeWidth={2}
                      fillOpacity={0.3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#3b82f6" }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-in-out"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={Object.entries(stats.eventMetrics).map(([id, ev]) => ({
                name: ev.title,
                Revenue: ev.revenue,
                Tickets: ev.tickets || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#9333ea" />
              <YAxis yAxisId="right" orientation="right" stroke="#2563eb" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Revenue" fill="#9333ea" />
              <Bar yAxisId="right" dataKey="Tickets" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* 🧾 All Events Summary (shows only when no specific event is selected) */}
      {!selectedEventId && (
        <div className="mt-10 bg-white p-6 rounded-lg shadow border border-gray-100">
          <h4 className="font-semibold text-purple-700 mb-4">
            Latest Purchases (All Events)
          </h4>

          {stats.lastPurchases?.length > 0 ? (
            <table className="min-w-full border-t border-gray-200 text-sm text-gray-800 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3">Event</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Tickets</th>
                  <th className="text-left py-2 px-3">Amount (£)</th>
                  <th className="text-left py-2 px-3">Purchase Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.lastPurchases.map((p, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="py-2 px-3">{p.event_title}</td>
                    <td className="py-2 px-3">{p.email}</td>
                    <td className="py-2 px-3">{p.quantity}</td>
                    <td className="py-2 px-3">£{p.amount.toFixed(2)}</td>
                    <td className="py-2 px-3">
                      {new Date(p.created_at).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}

                {/* ✅ Totals row placed correctly inside tbody */}
                {stats.lastPurchases.length > 0 && (
                  <tr className="bg-purple-50 font-semibold text-purple-800 border-t border-purple-200">
                    <td className="py-2 px-3">Totals</td>
                    <td></td>
                    <td className="py-2 px-3">
                      {stats.lastPurchases.reduce(
                        (sum, p) => sum + (p.quantity || 1),
                        0
                      )}
                    </td>
                    <td className="py-2 px-3">
                      £
                      {stats.lastPurchases
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toFixed(2)}
                    </td>
                    <td className="py-2 px-3">
                      £
                      {(
                        stats.lastPurchases.reduce(
                          (sum, p) => sum + (p.amount || 0),
                          0
                        ) /
                        stats.lastPurchases.reduce(
                          (sum, p) => sum + (p.quantity || 1),
                          0
                        )
                      ).toFixed(2)}{" "}
                      avg
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic">No recent purchases found.</p>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
            >
              View All Attendees
            </button>
            <button
              onClick={downloadAllEventsCSV}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
            >
              Download All Events CSV
            </button>
          </div>

          {/* <div className="flex justify-end mt-4">
            <button
              onClick={downloadAllEventsCSV}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
            >
              Download All Events CSV
            </button>
          </div> */}
        </div>
      )}

      {/* 👥 Registered Attendees List */}
      {selectedEventId && (
        <div className="mt-10 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-purple-700">
              Registered Attendees ({sortedAttendees.length})
            </h4>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
            >
              View All Attendees
            </button>
          </div>

          {sortedAttendees.length > 0 ? (
            <>
              <table className="min-w-full border-t border-gray-200 text-sm text-gray-800 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("name")}
                    >
                      Name
                      {sortConfig.key === "name"
                        ? sortConfig.direction === "asc"
                          ? " ▲"
                          : " ▼"
                        : ""}
                    </th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Tickets</th>
                    <th className="text-left py-2 px-3">Price/Ticket (£)</th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("amount")}
                    >
                      Total Paid (£)
                      {sortConfig.key === "amount"
                        ? sortConfig.direction === "asc"
                          ? " ▲"
                          : " ▼"
                        : ""}
                    </th>
                    <th
                      className="text-left py-2 px-3 cursor-pointer"
                      onClick={() => requestSort("created_at")}
                    >
                      Purchase Date
                      {sortConfig.key === "created_at"
                        ? sortConfig.direction === "asc"
                          ? " ▲"
                          : " ▼"
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
                        <td className="py-2 px-3">{a.quantity || 1}</td>
                        <td className="py-2 px-3">
                          £{(a.amount / (a.quantity || 1)).toFixed(2)}
                        </td>
                        <td className="py-2 px-3">£{a.amount.toFixed(2)}</td>
                        <td className="py-2 px-3">{formattedDate}</td>
                      </tr>
                    );
                  })}
                  {sortedAttendees.length > 0 && (
                    <tr className="bg-purple-50 font-semibold text-purple-800 border-t border-purple-200">
                      <td className="py-2 px-3">Totals</td>
                      <td></td>
                      <td className="py-2 px-3">
                        {sortedAttendees.reduce(
                          (sum, a) => sum + (a.quantity || 1),
                          0
                        )}
                      </td>
                      <td className="py-2 px-3">
                        £
                        {sortedAttendees
                          .reduce((sum, a) => sum + (a.amount || 0), 0)
                          .toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        £
                        {(
                          sortedAttendees.reduce(
                            (sum, a) => sum + (a.amount || 0),
                            0
                          ) /
                          sortedAttendees.reduce(
                            (sum, a) => sum + (a.quantity || 1),
                            0
                          )
                        ).toFixed(2)}{" "}
                        avg
                      </td>
                    </tr>
                  )}
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
                    Download CSV
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

      {/* 🟣 Attendees / Purchases Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-semibold text-purple-700 mb-4 text-center">
              {selectedEventId ? "All Attendees" : "All Event Purchases"}
            </h3>

            {/* 🔍 Search input */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search attendees by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-2/3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              />

              <button
                onClick={downloadModalCSV}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition w-full sm:w-auto"
              >
                Download CSV
              </button>
            </div>

            {selectedEventId ? (
              sortedAttendees.length > 0 ? (
                <table className="min-w-full border-t border-gray-200 text-sm text-gray-800 mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Tickets</th>
                      <th className="text-left py-2 px-3">Total (£)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((a, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="py-2 px-3">
                          {a.first_name || a.last_name
                            ? `${a.first_name || ""} ${
                                a.last_name || ""
                              }`.trim()
                            : "N/A"}
                        </td>
                        <td className="py-2 px-3">{a.email}</td>
                        <td className="py-2 px-3">{a.quantity || 1}</td>
                        <td className="py-2 px-3">£{a.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 italic text-center">
                  No attendees found for this event.
                </p>
              )
            ) : stats.lastPurchases?.length > 0 ? (
              <table className="min-w-full border-t border-gray-200 text-sm text-gray-800 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">Event</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Tickets</th>
                    <th className="text-left py-2 px-3">Total (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lastPurchases.map((p, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="py-2 px-3">{p.event_title}</td>
                      <td className="py-2 px-3">{p.email}</td>
                      <td className="py-2 px-3">{p.quantity}</td>
                      <td className="py-2 px-3">£{p.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 italic text-center">
                No purchases found yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
