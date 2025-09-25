// src/components/EventCard.jsx
import React from "react";

export default function EventCard({ title, date, price }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-gray-600">{date}</p>
      <p className="text-sm mt-1">{price}</p>
    </div>
  );
}
