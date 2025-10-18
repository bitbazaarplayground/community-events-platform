// src/components/LocationAutocomplete.jsx
import { useEffect, useRef, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function LocationAutocomplete({
  value,
  onChange,
  enableSuggestions = true,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  // 🧠 Cache to avoid repeated fetches
  const cacheRef = useRef({});
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      setNoResults(false);
      return;
    }

    const query = value.trim().toLowerCase();

    // If cached, use it instantly
    if (cacheRef.current[query]) {
      setSuggestions(cacheRef.current[query]);
      setNoResults(cacheRef.current[query].length === 0);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce typing by 600ms
    const handler = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      setLoading(true);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&addressdetails=1&limit=5`,
          { signal: abortControllerRef.current.signal }
        );

        const data = await res.json();
        cacheRef.current[query] = data; // store in cache

        setSuggestions(data.slice(0, 5));
        setNoResults(data.length === 0);
      } catch (err) {
        if (err.name !== "AbortError")
          console.error("Location fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-center border border-gray-300 rounded focus-within:ring-2 focus-within:ring-purple-500 bg-white">
        <FaMapMarkerAlt className="ml-3 text-purple-500" />
        <input
          type="text"
          placeholder="Enter location"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded outline-none text-gray-700 bg-transparent"
        />
        {loading && (
          <div className="animate-spin border-2 border-t-purple-500 border-gray-200 rounded-full w-4 h-4 mr-3"></div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {enableSuggestions && suggestions.length > 0 && (
        <ul className="absolute bg-white border border-gray-200 mt-1 w-full rounded-lg shadow-lg z-10">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => {
                onChange(s.display_name);
                setSuggestions([]);
              }}
              className="px-4 py-2 hover:bg-purple-100 text-sm text-gray-700 cursor-pointer"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {enableSuggestions && noResults && !loading && (
        <div className="absolute bg-white border border-gray-200 mt-1 w-full rounded-lg shadow-lg z-10 px-4 py-2 text-sm text-gray-500">
          No results found
        </div>
      )}
    </div>
  );
}
