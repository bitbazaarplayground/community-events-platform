// src/pages/Browse.jsx
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

export default function Browse() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date_time", { ascending: true });
      if (!error) setEvents(data);
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero section */}
      <section className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-lg font-semibold text-purple-200">
            Find Your Next Experience
          </h2>
          <h1 className="text-4xl md:text-5xl font-extrabold mt-2">
            Discover & Promote <br /> Upcoming Events
          </h1>

          {/* Search Filters Bar */}
          <div className="bg-white rounded-full shadow-lg mt-10 flex flex-col md:flex-row items-center p-3 gap-3 max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Search Event"
              className="flex-1 px-4 py-2 rounded-full border focus:outline-none text-gray-700"
            />
            <input
              type="text"
              placeholder="Search Location"
              className="flex-1 px-4 py-2 rounded-full border focus:outline-none text-gray-700"
            />
            <select className="flex-1 px-4 py-2 rounded-full border text-gray-700">
              <option>Category</option>
              <option>Music</option>
              <option>Tech</option>
              <option>Art</option>
              <option>Other</option>
            </select>
            <button className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-purple-700 transition">
              Search
            </button>
          </div>
        </div>

        {/* Floating circular images */}
        <div className="absolute top-10 right-10 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute bottom-12 left-12 w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src="https://randomuser.me/api/portraits/women/45.jpg"
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-900">
          Featured Events
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Upcoming events you won’t want to miss
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.length === 0 ? (
            <p className="col-span-full text-center text-gray-600">
              No events available
            </p>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                date={event.date_time}
                price={event.price}
                location={event.location}
                description={event.description}
                event_type={event.event_type}
                seats_left={event.seats_left}
                image_url={event.image_url}
                creatorId={event.created_by}
              />
            ))
          )}
        </div>

        <div className="flex justify-center mt-12">
          <button className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition">
            See More Events →
          </button>
        </div>
      </section>
    </div>
  );
}
