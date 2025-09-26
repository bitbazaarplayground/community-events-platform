// src/components/SearchBar.jsx
import React from "react";

export default function SearchBar() {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 mt-6 mb-10 px-4 md:px-12">
      <input
        type="text"
        placeholder="Search events"
        className="border px-4 py-2 rounded-md w-full md:w-1/3"
      />
      <select className="border px-4 py-2 rounded-md">
        <option>Date</option>
      </select>
      <select className="border px-4 py-2 rounded-md">
        <option>All types</option>
      </select>
      <select className="border px-4 py-2 rounded-md">
        <option>Free</option>
      </select>
    </div>
  );
}
