// src/pages/UserDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { searchTicketmaster } from "../lib/ticketmaster.js";
import { supabase } from "../supabaseClient.js";

import "../styles/swiper.css";

// Shared placeholder (all 3 sections for now)
const EVENT_PLACEHOLDER = "/img/concertCrowd.jpeg";

// Format helper
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

// Build a friendly avatar if user has no avatar_url
const avatarFromName = (nameOrEmail) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nameOrEmail || "User"
  )}&background=6D28D9&color=fff&size=128&bold=true`;

export default function UserDashboard() {
  const navigate = useNavigate();

  // ===== Profile =====
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ===== Discover carousel =====
  const [discoverEvents, setDiscoverEvents] = useState([]);
  const [loadingDiscover, setLoadingDiscover] = useState(true);

  // Load current user + profile
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: udata } = await supabase.auth.getUser();
      const u = udata?.user || null;
      if (!active) return;
      setUser(u);

      if (u) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("first_name,last_name,avatar_url,username")
          .eq("id", u.id)
          .maybeSingle();

        if (!active) return;
        setProfile(prof || null);
      }

      setLoadingUser(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Discover carousel (shuffle of local + Ticketmaster)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingDiscover(true);

        // Local (a few upcoming)
        const { data: localRows } = await supabase
          .from("events")
          .select("id,title,date_time,location,image_url")
          .gte("date_time", new Date().toISOString())
          .order("date_time", { ascending: true })
          .limit(12);

        const local = (localRows || []).map((ev) => ({
          id: ev.id,
          title: ev.title,
          date: ev.date_time,
          location: ev.location,
          image_url: ev.image_url,
          external_url: null,
        }));

        // Ticketmaster
        console.log("Calling Ticketmaster search...");
        const tm = await searchTicketmaster({ location: "UK" }, 0);

        const external = (tm.events || []).slice(0, 12).map((ev) => ({
          id: ev.id,
          title: ev.title,
          date: ev.date_time,
          location: ev.location,
          image_url: ev.image_url,
          external_url: ev.external_url || null,
        }));

        console.log("Ticketmaster API events:", tm.events);

        // Merge + shuffle
        const merged = [...local, ...external];
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }
        console.log("Merged discover events:", merged);

        if (!active) return;
        setDiscoverEvents(merged.slice(0, 12));
      } catch (e) {
        console.error("Discover load error:", e);
        if (!active) return;
        setDiscoverEvents([]);
      } finally {
        if (active) setLoadingDiscover(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const fullName = useMemo(() => {
    if (!profile) return user?.email || "User";
    const fn = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fn || user?.email || "User";
  }, [profile, user]);

  // Simple card that acts as a link to a section
  function SectionCard({ title, link }) {
    return (
      <div
        onClick={() => navigate(link)}
        className="cursor-pointer bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex flex-col"
      >
        <img
          src={EVENT_PLACEHOLDER}
          alt={`${title} placeholder`}
          className="h-32 w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = EVENT_PLACEHOLDER;
          }}
        />
        <div className="p-3 flex-1 flex items-center justify-center">
          <h4 className="font-semibold text-center">{title}</h4>
        </div>
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {children}
      </div>
    );
  }

  // ===== RENDER =====
  if (loadingUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-gray-600">Loading your dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-gray-600">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={profile?.avatar_url || avatarFromName(fullName)}
            alt={fullName}
            className="w-16 h-16 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = avatarFromName(fullName);
            }}
          />
          <div>
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-gray-500">
              {profile?.username ? `@${profile.username}` : user.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/profile/edit")}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Edit Profile
        </button>
      </div>

      {/* My Events + Saved Events + Past */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="My Events">
          <SectionCard title="Go to My Events" link="/me/events" />
        </Section>

        <Section title="Saved Events">
          <SectionCard title="Go to Saved Events" link="/me/saved" />
        </Section>

        <Section title="Past Events">
          <SectionCard title="Go to Past Events" link="/me/past" />
        </Section>
      </div>

      {/* Discover carousel */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Discover More Events</h2>
        {loadingDiscover ? (
          <div className="text-gray-500 text-sm">Loading suggestions…</div>
        ) : discoverEvents.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No suggestions at the moment.
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={24}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            loop
            grabCursor
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
          >
            {discoverEvents.map((ev) => (
              <SwiperSlide key={ev.id}>
                <div
                  className="
                    bg-white rounded-lg shadow transition
                    hover:shadow-lg
                    duration-200 ease-out
                    will-change-transform
                    hover:-translate-y-1 hover:scale-[1.02]
                    overflow-hidden h-full flex flex-col
                  "
                >
                  <a
                    href={ev.external_url || "#"}
                    target={ev.external_url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="block"
                    aria-label={ev.title}
                  >
                    <img
                      src={ev.image_url || EVENT_PLACEHOLDER}
                      alt={ev.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = EVENT_PLACEHOLDER;
                      }}
                      className="h-44 w-full object-cover"
                    />
                  </a>
                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="font-semibold line-clamp-1">{ev.title}</h4>
                    <p className="text-sm text-gray-500">{fmt(ev.date_time)}</p>
                    {ev.location && (
                      <p className="text-xs text-gray-400">{ev.location}</p>
                    )}
                    <div className="mt-auto pt-3">
                      {ev.external_url ? (
                        <a
                          href={ev.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-purple-600 font-semibold hover:underline"
                        >
                          View details →
                        </a>
                      ) : (
                        <button
                          onClick={() => navigate("/browse")}
                          className="text-purple-600 font-semibold hover:underline"
                        >
                          View details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </div>
  );
}

// // src/pages/UserDashboard.jsx
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "swiper/css";
// import "swiper/css/navigation";
// import "swiper/css/pagination";
// import { Autoplay, Navigation, Pagination } from "swiper/modules";
// import { Swiper, SwiperSlide } from "swiper/react";

// import { buildGoogleCalendarUrl } from "../lib/calendar.js";
// import { searchTicketmaster } from "../lib/ticketmaster.js";
// import { supabase } from "../supabaseClient.js";

// import "../styles/swiper.css";

// // Use absolute path so Vite serves from /public
// const EVENT_PLACEHOLDER = "/img/concertCrowd.jpeg";

// // Handy formatter
// const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

// // Build a friendly avatar if user has no avatar_url
// const avatarFromName = (nameOrEmail) =>
//   `https://ui-avatars.com/api/?name=${encodeURIComponent(
//     nameOrEmail || "User"
//   )}&background=6D28D9&color=fff&size=128&bold=true`;

// export default function UserDashboard() {
//   const navigate = useNavigate();

//   // ===== Profile =====
//   const [user, setUser] = useState(null);
//   const [profile, setProfile] = useState(null);
//   const [loadingUser, setLoadingUser] = useState(true);

//   // ===== My Events (from signups) =====
//   const [bookedEvents, setBookedEvents] = useState([]);
//   const [loadingBookings, setLoadingBookings] = useState(true);

//   // ===== Saved Events (we’ll wire later) =====
//   const [savedEvents] = useState([]);

//   // ===== Discover carousel =====
//   const [discoverEvents, setDiscoverEvents] = useState([]);
//   const [loadingDiscover, setLoadingDiscover] = useState(true);

//   // Load current user + profile
//   useEffect(() => {
//     let active = true;
//     (async () => {
//       const { data: udata } = await supabase.auth.getUser();
//       const u = udata?.user || null;
//       if (!active) return;
//       setUser(u);

//       if (u) {
//         const { data: prof } = await supabase
//           .from("user_profiles")
//           .select("first_name,last_name,avatar_url,username")
//           .eq("id", u.id)
//           .maybeSingle();

//         if (!active) return;
//         setProfile(prof || null);
//       }

//       setLoadingUser(false);
//     })();
//     return () => {
//       active = false;
//     };
//   }, []);

//   // Fetch My Events (signups joined to events)
//   useEffect(() => {
//     if (!user) return;
//     let active = true;

//     (async () => {
//       setLoadingBookings(true);
//       const { data, error } = await supabase
//         .from("signups")
//         .select(
//           `
//           event:events (
//             id, title, description, location, date_time, price, image_url,
//             categories(name)
//           )
//         `
//         )
//         .eq("user_id", user.id);

//       if (!active) return;

//       if (error) {
//         console.error("Load signups error:", error.message);
//         setBookedEvents([]);
//       } else {
//         const now = Date.now();
//         const rows = (data || [])
//           .map((r) => r.event)
//           .filter(Boolean)
//           .filter((ev) => {
//             const ts = ev?.date_time ? new Date(ev.date_time).getTime() : 0;
//             return ts >= now; // upcoming only
//           })
//           .sort((a, b) => {
//             const ta = a.date_time ? new Date(a.date_time).getTime() : 0;
//             const tb = b.date_time ? new Date(b.date_time).getTime() : 0;
//             return ta - tb;
//           })
//           .map((ev) => ({
//             id: ev.id,
//             title: ev.title,
//             date_time: ev.date_time,
//             price: ev.price,
//             location: ev.location,
//             description: ev.description,
//             image_url: ev.image_url,
//             category: ev.categories?.name || null,

//             // local events only
//             creatorId: null,
//             seats_left: null,
//             external_source: null,
//             external_url: null,
//             external_organizer: null,
//           }));

//         setBookedEvents(rows);
//       }
//       setLoadingBookings(false);
//     })();

//     return () => {
//       active = false;
//     };
//   }, [user]);

//   // Discover carousel (shuffle of local + Ticketmaster)
//   useEffect(() => {
//     let active = true;
//     (async () => {
//       try {
//         setLoadingDiscover(true);

//         // Local (a few upcoming)
//         const { data: localRows } = await supabase
//           .from("events")
//           .select("id,title,date_time,location,image_url")
//           .gte("date_time", new Date().toISOString())
//           .order("date_time", { ascending: true })
//           .limit(12);

//         const local = (localRows || []).map((ev) => ({
//           id: ev.id,
//           title: ev.title,
//           date: ev.date_time,
//           location: ev.location,
//           image_url: ev.image_url,
//           external_url: null,
//         }));

//         // Ticketmaster (simple default query to the UK)
//         const tm = await searchTicketmaster({ q: "events", location: "UK" }, 0);
//         const external = (tm.events || []).slice(0, 12).map((ev) => ({
//           id: ev.id,
//           title: ev.title,
//           date: ev.date_time,
//           location: ev.location,
//           image_url: ev.image_url,
//           external_url: ev.external_url || null,
//         }));

//         // Merge + simple shuffle
//         const merged = [...local, ...external];
//         for (let i = merged.length - 1; i > 0; i--) {
//           const j = Math.floor(Math.random() * (i + 1));
//           [merged[i], merged[j]] = [merged[j], merged[i]];
//         }

//         if (!active) return;
//         setDiscoverEvents(merged.slice(0, 12));
//       } catch (e) {
//         console.error("Discover load error:", e);
//         if (!active) return;
//         setDiscoverEvents([]);
//       } finally {
//         if (active) setLoadingDiscover(false);
//       }
//     })();

//     return () => {
//       active = false;
//     };
//   }, []);

//   const fullName = useMemo(() => {
//     if (!profile) return user?.email || "User";
//     const fn = [profile.first_name, profile.last_name]
//       .filter(Boolean)
//       .join(" ")
//       .trim();
//     return fn || user?.email || "User";
//   }, [profile, user]);

//   // Small card for dashboard lists (with Add to Calendar)
//   function BookedCard({ ev }) {
//     const startISO = ev.date_time;
//     const endISO = startISO
//       ? new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString()
//       : null;

//     const gcalHref =
//       startISO && endISO
//         ? buildGoogleCalendarUrl({
//             title: ev.title,
//             startISO,
//             endISO,
//             details: ev.description || "",
//             location: ev.location || "",
//           })
//         : null;

//     return (
//       <div className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex flex-col">
//         <img
//           src={ev.image_url || EVENT_PLACEHOLDER}
//           alt={ev.title}
//           className="h-32 w-full object-cover"
//           referrerPolicy="no-referrer"
//           onError={(e) => {
//             e.currentTarget.onerror = null;
//             e.currentTarget.src = EVENT_PLACEHOLDER;
//           }}
//         />
//         <div className="p-3 flex-1 flex flex-col">
//           <h4 className="font-semibold text-sm line-clamp-1">{ev.title}</h4>
//           <p className="text-xs text-gray-500">{fmt(ev.date_time)}</p>
//           {ev.location && (
//             <p className="text-xs text-gray-400 line-clamp-1">{ev.location}</p>
//           )}
//           <div className="mt-auto pt-2 flex gap-2">
//             {gcalHref && (
//               <a
//                 href={gcalHref}
//                 target="_blank"
//                 rel="noreferrer"
//                 className="text-xs inline-block px-2 py-1 border border-green-600 text-green-700 rounded hover:bg-green-50"
//               >
//                 Add to Google Calendar
//               </a>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   function Section({ title, children, rightCta, placeholderImage }) {
//     return (
//       <div className="mb-6">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-lg font-semibold">{title}</h3>
//           {rightCta}
//         </div>
//         <div className="relative">
//           {children}

//           {!children || (Array.isArray(children) && children.length === 0) ? (
//             <img
//               src={placeholderImage || EVENT_PLACEHOLDER}
//               alt={`${title} placeholder`}
//               className="w-full h-40 object-cover rounded-lg shadow-sm"
//             />
//           ) : null}
//         </div>
//       </div>
//     );
//   }

//   // ===== RENDER =====
//   if (loadingUser) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10">
//         <p className="text-gray-600">Loading your dashboard…</p>
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10">
//         <p className="text-gray-600">Please sign in to view your dashboard.</p>
//       </div>
//     );
//   }

//   // Only show the first booked event here; “View all” opens the full list page
//   const previewBooked = bookedEvents.slice(0, 1);

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
//       {/* Profile Header */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <img
//             src={profile?.avatar_url || avatarFromName(fullName)}
//             alt={fullName}
//             className="w-16 h-16 rounded-full object-cover"
//             onError={(e) => {
//               e.currentTarget.onerror = null;
//               e.currentTarget.src = avatarFromName(fullName);
//             }}
//           />
//           <div>
//             <h2 className="text-2xl font-bold">{fullName}</h2>
//             <p className="text-gray-500">
//               {profile?.username ? `@${profile.username}` : user.email}
//             </p>
//           </div>
//         </div>
//         <button
//           onClick={() => navigate("/profile/edit")}
//           className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
//         >
//           Edit Profile
//         </button>
//       </div>

//       {/* My Events + Saved Events + Past (placeholder) */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <Section
//           title="My Events"
//           rightCta={
//             <button
//               className="text-xs text-purple-600 hover:underline"
//               onClick={() => navigate("/me/events")}
//             >
//               View all
//             </button>
//           }
//           placeholderImage="/img/concertCrowd.jpeg"
//         >
//           {loadingBookings ? (
//             <p className="text-gray-500 text-sm">Loading your bookings…</p>
//           ) : previewBooked.length === 0 ? (
//             <p className="text-gray-500 text-sm">
//               You haven’t signed up for any events yet.
//             </p>
//           ) : (
//             <div className="grid grid-cols-1 gap-3">
//               {previewBooked.map((ev) => (
//                 <BookedCard key={ev.id} ev={ev} />
//               ))}
//             </div>
//           )}
//         </Section>

//         <Section
//           title="Saved Events"
//           rightCta={
//             <button
//               className="text-xs text-purple-600 hover:underline"
//               onClick={() => navigate("/browse")}
//             >
//               Find events →
//             </button>
//           }
//           placeholderImage="/img/savedPlaceholder.jpeg"
//         >
//           <p className="text-gray-500 text-sm">
//             You haven’t saved any events yet.
//           </p>
//         </Section>

//         <Section
//           title="Past Events"
//           placeholderImage="/img/pastPlaceholder.jpeg"
//         >
//           <p className="text-gray-500 text-sm">
//             Past event history will appear here.
//           </p>
//         </Section>
//       </div>

//       {/* Discover carousel */}
//       <div>
//         <h2 className="text-xl font-semibold mb-4">Discover More Events</h2>
//         {loadingDiscover ? (
//           <div className="text-gray-500 text-sm">Loading suggestions…</div>
//         ) : discoverEvents.length === 0 ? (
//           <div className="text-gray-500 text-sm">
//             No suggestions at the moment.
//           </div>
//         ) : (
//           <Swiper
//             modules={[Navigation, Pagination, Autoplay]}
//             spaceBetween={24}
//             slidesPerView={1}
//             navigation
//             pagination={{ clickable: true }}
//             autoplay={{
//               delay: 2500,
//               disableOnInteraction: false,
//               pauseOnMouseEnter: true,
//             }}
//             loop
//             grabCursor
//             breakpoints={{
//               640: { slidesPerView: 2 },
//               1024: { slidesPerView: 3 },
//             }}
//           >
//             {discoverEvents.map((ev) => (
//               <SwiperSlide key={ev.id}>
//                 <div
//                   className="
//                     bg-white rounded-lg shadow transition
//                     hover:shadow-lg
//                     duration-200 ease-out
//                     will-change-transform
//                     hover:-translate-y-1 hover:scale-[1.02]
//                     overflow-hidden h-full flex flex-col
//                   "
//                 >
//                   <a
//                     href={ev.external_url || "#"}
//                     target={ev.external_url ? "_blank" : "_self"}
//                     rel="noreferrer"
//                     className="block"
//                     aria-label={ev.title}
//                   >
//                     <img
//                       src={ev.image_url || EVENT_PLACEHOLDER}
//                       alt={ev.title}
//                       loading="lazy"
//                       referrerPolicy="no-referrer"
//                       onError={(e) => {
//                         e.currentTarget.onerror = null;
//                         e.currentTarget.src = EVENT_PLACEHOLDER;
//                       }}
//                       className="h-44 w-full object-cover"
//                     />
//                   </a>
//                   <div className="p-3 flex-1 flex flex-col">
//                     <h4 className="font-semibold line-clamp-1">{ev.title}</h4>
//                     <p className="text-sm text-gray-500">{fmt(ev.date)}</p>
//                     {ev.location && (
//                       <p className="text-xs text-gray-400">{ev.location}</p>
//                     )}
//                     <div className="mt-auto pt-3">
//                       {ev.external_url ? (
//                         <a
//                           href={ev.external_url}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="inline-block text-purple-600 font-semibold hover:underline"
//                         >
//                           View details →
//                         </a>
//                       ) : (
//                         <button
//                           onClick={() => navigate("/browse")}
//                           className="text-purple-600 font-semibold hover:underline"
//                         >
//                           View details
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </SwiperSlide>
//             ))}
//           </Swiper>
//         )}
//       </div>
//     </div>
//   );
// }
