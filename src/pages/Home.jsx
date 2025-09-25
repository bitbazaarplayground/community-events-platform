// src/pages/Home.jsx
import React from "react";
import EventCard from "../components/EventCard";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";

const eventData = [
  {
    title: "Community Book Club",
    date: "Sat, May 18 – 10:00 AM",
    price: "Free",
  },
  {
    title: "Yoga in the Park",
    date: "Sun, May 19 – 9:00 AM",
    price: "Pay as you feel",
  },
  {
    title: "Local History Talk",
    date: "Mon, May 20 – 7:00 PM",
    price: "$10",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <SearchBar />
      <main className="px-4 md:px-12">
        <h2 className="text-xl font-semibold mb-6">Upcoming Events</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventData.map((event, index) => (
            <EventCard
              key={index}
              title={event.title}
              date={event.date}
              price={event.price}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
