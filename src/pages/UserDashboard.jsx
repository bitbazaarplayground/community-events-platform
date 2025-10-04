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

const IMG_MY_EVENTS = "/img/concertCrowd.jpeg";
const IMG_SAVED_EVENTS = "/img/road.jpeg";
const IMG_PAST_EVENTS = "/img/PastEvents.png";
const EVENT_PLACEHOLDER = "https://via.placeholder.com/600x360?text=Event";

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

  // ===== Saved Events =====
  const [savedEvents, setSavedEvents] = useState([]);

  // --- Load saved events (hybrid: local + ticketmaster)
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from("saved_events")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching saved_events:", error.message);
        return;
      }

      // classify by id type
      const isUuid = (str) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          str
        );

      const localIds = data.map((ev) => ev.event_id).filter((id) => isUuid(id));
      const tmEvents = data.filter((ev) => !isUuid(ev.event_id));

      let localEvents = [];
      if (localIds.length > 0) {
        const { data: rows, error: err2 } = await supabase
          .from("events")
          .select("*")
          .in("id", localIds);

        if (!err2) localEvents = rows || [];
        else console.error("Error fetching local events:", err2.message);
      }

      // Merge both types
      const merged = [
        ...localEvents,
        ...tmEvents.map((ev) => ({
          id: ev.event_id,
          title: ev.title,
          location: ev.location,
          image_url: ev.image_url,
          external_url: ev.external_url,
          external_source: "ticketmaster",
        })),
      ];

      setSavedEvents(merged);
    })();
  }, []);

  // --- Load current user + profile
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

  // --- Discover carousel (shuffle local + Ticketmaster)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingDiscover(true);

        // Local upcoming events
        const { data: localRows } = await supabase
          .from("events")
          .select("id,title,date_time,location,image_url")
          .gte("date_time", new Date().toISOString())
          .order("date_time", { ascending: true })
          .limit(12);

        const local = (localRows || []).map((ev) => ({
          id: ev.id,
          title: ev.title,
          date_time: ev.date_time,
          location: ev.location,
          image_url: ev.image_url,
          external_url: null,
          source: "Local",
        }));

        // Random Ticketmaster city
        const cities = [
          "London",
          "Manchester",
          "Liverpool",
          "Birmingham",
          "Leeds",
          "Glasgow",
        ];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];

        // Fetch Ticketmaster events
        const tm = await searchTicketmaster({ location: randomCity }, 0);

        const external = (tm.events || []).slice(0, 12).map((ev) => ({
          id: ev.id,
          title: ev.title,
          date_time: ev.date_time,
          location: ev.location,
          image_url: ev.image_url,
          external_url: ev.external_url || null,
          source: "Ticketmaster",
        }));

        // Merge + shuffle
        const merged = [...local, ...external];
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }

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

  // UI components
  function SectionCard({ link, imgSrc, alt }) {
    return (
      <div
        onClick={() => navigate(link)}
        className="cursor-pointer bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden"
      >
        <img
          src={imgSrc}
          alt={alt}
          className="h-40 w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = EVENT_PLACEHOLDER;
          }}
        />
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-center mb-3">{title}</h3>
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
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={profile?.avatar_url || avatarFromName(fullName)}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = avatarFromName(fullName);
              }}
            />
            <div>
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="opacity-90">
                {profile?.username ? `@${profile.username}` : user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/profile/edit")}
            className="px-4 py-2 bg-white text-purple-700 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="My Events">
          <SectionCard
            link="/me/events"
            imgSrc={IMG_MY_EVENTS}
            alt="My Events"
          />
        </Section>
        <Section title="Saved Events">
          <SectionCard
            link="/me/saved"
            imgSrc={IMG_SAVED_EVENTS}
            alt="Saved Events"
          />
        </Section>
        <Section title="Past Events">
          <SectionCard
            link="/me/past"
            imgSrc={IMG_PAST_EVENTS}
            alt="Past Events"
          />
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
            className="discover-swiper"
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
                <div className="bg-white rounded-lg shadow transition hover:shadow-lg duration-200 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden h-full flex flex-col">
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
                    <p className="text-xs italic text-purple-500 mt-1">
                      {ev.source}
                    </p>
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
