// src/components/FancySearchBar.jsx
import { useEffect, useRef, useState } from "react";
import { FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import { MdCategory } from "react-icons/md";
import { supabase } from "../supabaseClient.js";

export default function FancySearchBar({
  onSearch,
  variant = "home",
  initialQuery = "",
  initialFilters = {},
}) {
  const phrases = ["events...", "location...", "event...", "categories..."];

  // ----- Home state -----
  const [inputValue, setInputValue] = useState(initialQuery);
  const [userTyped, setUserTyped] = useState(initialQuery.length > 0);
  const inputTouchedRef = useRef(false);
  const lastQueryRef = useRef("");

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
  const lastBrowseQueryRef = useRef({ event: "", location: "", category: "" });

  const filtersTouchedRef = useRef(false);

  const basePrefix = index === 0 ? "Search " : "Search by ";

  // Keep Home state in sync
  useEffect(() => {
    setInputValue(initialQuery);
    setUserTyped(initialQuery.length > 0);
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

  // ----- Debounced search: HOME -----
  useEffect(() => {
    if (variant !== "home") return;
    const handler = setTimeout(() => {
      const trimmed = inputValue.trim();

      if (
        inputTouchedRef.current &&
        trimmed.length > 0 &&
        trimmed !== lastQueryRef.current
      ) {
        lastQueryRef.current = trimmed;
        onSearch?.(trimmed);
      }
    }, 700);
    return () => clearTimeout(handler);
  }, [variant, inputValue]);

  // ----- Debounced search: BROWSE -----
  useEffect(() => {
    if (variant !== "browse") return;

    const handler = setTimeout(() => {
      if (filtersTouchedRef.current) {
        const selected = categories.find((c) => c.id === categoryQuery);

        const currentQuery = {
          event: eventQuery.trim(),
          location: locationQuery.trim(),
          category: categoryQuery,
        };

        const last = lastBrowseQueryRef.current;
        const changed =
          currentQuery.event !== last.event ||
          currentQuery.location !== last.location ||
          currentQuery.category !== last.category;

        if (changed) {
          lastBrowseQueryRef.current = currentQuery;
          onSearch?.({
            event: currentQuery.event,
            location: currentQuery.location,
            category: currentQuery.category,
            categoryLabel: selected?.name || "",
          });
        }
      }
    }, 700);

    return () => clearTimeout(handler);
  }, [variant, eventQuery, locationQuery, categoryQuery, categories]);

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

  //        RENDER

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
          inputTouchedRef.current = true;
          const value = e.target.value;
          setInputValue(value);
          setUserTyped(value.length > 0);

          if (value.trim().length === 0) {
            onSearch?.("");
            lastQueryRef.current = "";
          }
        }}
        onKeyDown={handleKeyDown}
        className="w-full border-none text-gray-900 placeholder-gray-500 rounded-full px-4 py-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent"
        placeholder={userTyped ? "Search..." : ""}
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

      {/* Animated placeholder*/}
      {!userTyped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {basePrefix + text}
          <span className="inline-block w-[1px] ml-1">{blink ? "|" : " "}</span>
        </span>
      )}
    </div>
  );
}
