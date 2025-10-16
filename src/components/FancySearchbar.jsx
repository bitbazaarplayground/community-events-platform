// src/components/FancySearchBar.jsx
import { useEffect, useRef, useState } from "react";
import { FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import { MdCategory } from "react-icons/md";
import { supabase } from "../supabaseClient.js";

export default function FancySearchBar({
  onSearch,
  variant = "home",
  initialQuery = "", // prefill for Home
  initialFilters = {}, // prefill for Browse: { event, location, category }
}) {
  const phrases = ["events...", "location...", "event...", "categories..."];

  // ----- Home state -----
  const [inputValue, setInputValue] = useState(initialQuery);
  const [userTyped, setUserTyped] = useState(initialQuery.length > 0); // stops auto animation if user typed/prefilled
  const inputTouchedRef = useRef(false); // ✅ don't fire onSearch on mount

  // Typing animation
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  // ----- Browse filters -----
  const [eventQuery, setEventQuery] = useState(initialFilters.event || "");
  const [locationQuery, setLocationQuery] = useState(
    initialFilters.location || ""
  );
  const [categoryQuery, setCategoryQuery] = useState(
    initialFilters.category || ""
  );
  const [categories, setCategories] = useState([]);

  const filtersTouchedRef = useRef(false); // ✅ don't fire onSearch on mount (Browse)

  const basePrefix = index === 0 ? "Search " : "Search by ";

  // Keep Home state in sync if initialQuery changes (e.g., when coming back)
  useEffect(() => {
    setInputValue(initialQuery);
    setUserTyped(initialQuery.length > 0);
    // do NOT set inputTouchedRef.current here to avoid auto firing onSearch
  }, [initialQuery]);

  // Keep Browse filters in sync if initialFilters changes
  useEffect(() => {
    if (variant !== "browse") return;
    if (initialFilters.event !== undefined) setEventQuery(initialFilters.event);
    if (initialFilters.location !== undefined)
      setLocationQuery(initialFilters.location);
    if (initialFilters.category !== undefined)
      setCategoryQuery(initialFilters.category);
  }, [initialFilters, variant]);

  // ----- Animated placeholder (Home only) -----
  useEffect(() => {
    if (variant !== "home" || index >= phrases.length || userTyped) return;

    const current = phrases[index];
    const speed = deleting ? 50 : 120; // slower delete, moderate typing

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (deleting ? -1 : 1));
    }, speed);

    if (!deleting && subIndex === current.length) {
      setTimeout(() => setDeleting(true), 1000);
    } else if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [subIndex, deleting, index, userTyped, variant]);

  useEffect(() => {
    setText(phrases[index]?.substring(0, subIndex) || "");
  }, [subIndex, index]);

  // Blinking cursor (Home only if not typed)
  useEffect(() => {
    if (userTyped) return;
    const blinkInterval = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearInterval(blinkInterval);
  }, [userTyped]);

  // ----- Debounced search -----
  useEffect(() => {
    const handler = setTimeout(() => {
      if (variant === "home") {
        if (inputTouchedRef.current && inputValue.trim().length > 0) {
          onSearch?.(inputValue.trim());
        }
      } else {
        if (filtersTouchedRef.current) {
          const selected = categories.find((c) => c.id === categoryQuery);
          onSearch?.({
            event: eventQuery,
            location: locationQuery,
            category: categoryQuery,
            categoryLabel: selected?.name || "",
          });
        }
      }
    }, 700);

    return () => clearTimeout(handler);
  }, [eventQuery, locationQuery, categoryQuery]);

  // ----- Instant search on Enter -----
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (variant === "home") {
      const q = inputValue.trim();
      if (q.length === 0) return;
      onSearch?.(q);
    } else {
      const selected = categories.find((c) => c.id === categoryQuery);
      onSearch?.({
        event: eventQuery,
        location: locationQuery,
        category: categoryQuery,
        categoryLabel: selected?.name || "",
      });
    }
  };

  // ----- Fetch categories for Browse dropdown -----
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name");
      if (error) {
        console.error("Error fetching categories:", error.message);
      } else {
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  // =======================
  //        RENDER
  // =======================

  if (variant === "browse") {
    return (
      <div className="bg-white rounded-lg shadow-lg flex flex-col md:flex-row items-center p-3 gap-3">
        {/* Event search */}
        <div className="flex items-center flex-1 border-r px-3">
          <FaSearch className="text-purple-600 mr-2" />
          <input
            type="text"
            placeholder="Search Event"
            value={eventQuery}
            onChange={(e) => {
              filtersTouchedRef.current = true; // ✅ user interacted
              setEventQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="w-full py-2 focus:outline-none text-gray-700"
          />
        </div>

        {/* Location search */}
        <div className="flex items-center flex-1 border-r px-3">
          <FaMapMarkerAlt className="text-purple-600 mr-2" />
          <input
            type="text"
            placeholder="Search Location"
            value={locationQuery}
            onChange={(e) => {
              filtersTouchedRef.current = true;
              setLocationQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="w-full py-2 focus:outline-none text-gray-700"
          />
        </div>

        {/* Category dropdown */}
        <div className="flex items-center flex-1 px-3 relative">
          <MdCategory className="text-purple-600 mr-2" />
          <select
            value={categoryQuery}
            onChange={(e) => {
              filtersTouchedRef.current = true;
              const selected = categories.find((c) => c.id === e.target.value);
              setCategoryQuery(e.target.value);

              // Fire immediately with both id + label
              onSearch?.({
                event: eventQuery,
                location: locationQuery,
                category: e.target.value,
                categoryLabel: selected?.name || "",
              });
            }}
            className="w-full py-2 pr-8 bg-white text-gray-700 focus:outline-none appearance-none"
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <span className="absolute right-3 text-gray-400 pointer-events-none">
            ▼
          </span>
        </div>

        {/* Search button */}
        <button
          onClick={() => {
            const selected = categories.find((c) => c.id === categoryQuery);
            onSearch?.({
              event: eventQuery,
              location: locationQuery,
              category: categoryQuery,
              categoryLabel: selected?.name || "",
            });
          }}
          className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition"
          aria-label="Search"
        >
          <FaSearch />
        </button>
      </div>
    );
  }

  // ----- Home variant -----
  return (
    <div className="relative max-w-md mx-auto md:mx-0">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          inputTouchedRef.current = true; // ✅ user interacted (prevents firing on mount)
          setInputValue(e.target.value);
          setUserTyped(e.target.value.length > 0);
        }}
        onKeyDown={handleKeyDown}
        className="w-full border rounded-full px-4 py-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label="Search"
      />

      <button
        onClick={() => {
          const q = inputValue.trim();
          if (q.length > 0) {
            inputTouchedRef.current = true;
            onSearch?.(q);
          }
        }}
        className="absolute right-6 top-4 text-gray-400 hover:text-purple-600 transition"
        aria-label="Search"
      >
        <FaSearch />
      </button>

      {/* Animated placeholder (only if user hasn't typed) */}
      {!userTyped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {basePrefix + text}
          <span className="inline-block w-[1px] ml-1">{blink ? "|" : " "}</span>
        </span>
      )}
    </div>
  );
}
