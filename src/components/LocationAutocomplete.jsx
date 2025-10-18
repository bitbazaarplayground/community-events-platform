import { useEffect, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function LocationAutocomplete({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([]);
      setNoResults(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${value}&format=json`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.slice(0, 5));
        setNoResults(data.length === 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
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
      {suggestions.length > 0 && (
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
      {noResults && !loading && (
        <div className="absolute bg-white border border-gray-200 mt-1 w-full rounded-lg shadow-lg z-10 px-4 py-2 text-sm text-gray-500">
          No results found
        </div>
      )}
    </div>
  );
}
