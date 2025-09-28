// src/components/FancySearchBar.jsx
import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";

export default function FancySearchBar({ onSearch, variant = "home" }) {
  const phrases = ["events...", "location...", "event...", "categories..."];

  const [inputValue, setInputValue] = useState("");
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);
  const [userTyped, setUserTyped] = useState(false);

  // State for browse filters
  const [eventQuery, setEventQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const basePrefix = index === 0 ? "Search " : "Search by ";

  // Typing effect for home placeholder
  useEffect(() => {
    if (variant !== "home" || index >= phrases.length || userTyped) return;

    const current = phrases[index];
    const speed = deleting ? 50 : 120;
    const timeout = setTimeout(
      () => setSubIndex((prev) => prev + (deleting ? -1 : 1)),
      speed
    );

    if (!deleting && subIndex === current.length) {
      setTimeout(() => setDeleting(true), 1000);
    } else if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [subIndex, deleting, index, userTyped, variant]);

  useEffect(() => {
    setText(phrases[index]?.substring(0, subIndex));
  }, [subIndex, index]);

  // Cursor blink
  useEffect(() => {
    if (userTyped) return;
    const blinkInterval = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearInterval(blinkInterval);
  }, [userTyped]);

  // ✅ Debounced search (wait 300ms after typing)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (variant === "home") {
        onSearch?.(inputValue);
      } else {
        onSearch?.({
          event: eventQuery,
          location: locationQuery,
          category: categoryQuery,
        });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, eventQuery, locationQuery, categoryQuery, variant, onSearch]);

  // ✅ Instant search on Enter key (NEW)
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (variant === "home") {
        onSearch?.(inputValue); // run immediately
      } else {
        onSearch?.({
          event: eventQuery,
          location: locationQuery,
          category: categoryQuery,
        });
      }
    }
  };

  // ----- Render -----
  if (variant === "browse") {
    return (
      <div className="bg-white rounded-lg shadow-lg flex flex-col md:flex-row items-center p-3 gap-3">
        {/* Event search */}
        <div className="flex items-center flex-1 border-r px-3">
          <span className="text-gray-400 mr-2">🔍</span>
          <input
            type="text"
            placeholder="Search Event"
            value={eventQuery}
            onChange={(e) => setEventQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full py-2 focus:outline-none text-gray-700"
          />
        </div>

        {/* Location search */}
        <div className="flex items-center flex-1 border-r px-3">
          <span className="text-gray-400 mr-2">📍</span>
          <input
            type="text"
            placeholder="Search Location"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full py-2 focus:outline-none text-gray-700"
          />
        </div>

        {/* Category dropdown */}
        <div className="flex items-center flex-1 px-3 relative">
          <span className="text-purple-600 mr-2">🗂️</span>
          <select
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            className="w-full py-2 pr-8 bg-white text-gray-700 focus:outline-none appearance-none"
          >
            <option value="">Category</option>
            <option value="Music">Music</option>
            <option value="Tech">Tech</option>
            <option value="Art">Art</option>
            <option value="Other">Other</option>
          </select>

          {/* Custom dropdown arrow */}
          <span className="absolute right-3 text-gray-400 pointer-events-none">
            ▼
          </span>
        </div>

        {/* Search button */}
        <button
          onClick={() =>
            onSearch?.({
              event: eventQuery,
              location: locationQuery,
              category: categoryQuery,
            })
          }
          className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition"
        >
          <FaSearch />
        </button>
      </div>
    );
  }

  // ----- Default (Home search bar) -----
  return (
    <div className="relative max-w-md mx-auto md:mx-0">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setUserTyped(e.target.value.length > 0);
        }}
        onKeyDown={handleKeyDown} // ✅ Added Enter support
        className="w-full border rounded-full px-4 py-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <FaSearch className="absolute right-3 top-3 text-gray-400" />
      {!userTyped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {basePrefix + text}
          <span className="inline-block w-[1px] ml-1">{blink ? "|" : " "}</span>
        </span>
      )}
    </div>
  );
}
