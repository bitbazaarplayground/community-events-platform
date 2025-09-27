// src/components/FancySearchBar.jsx
import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";

export default function FancySearchBar() {
  const phrases = ["events...", "location...", "event...", "categories..."];

  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);
  const [userTyped, setUserTyped] = useState(false);

  const basePrefix = index === 0 ? "Search " : "Search by ";

  // Typing effect
  useEffect(() => {
    if (index >= phrases.length || userTyped) return;

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
  }, [subIndex, deleting, index, phrases, userTyped]);

  // Update displayed text
  useEffect(() => {
    setText(phrases[index].substring(0, subIndex));
  }, [subIndex, index]);

  // Cursor blink
  useEffect(() => {
    if (userTyped) return;
    const blinkInterval = setInterval(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, [userTyped]);

  return (
    <div className="relative max-w-md mx-auto md:mx-0">
      {/* Real input */}
      <input
        type="text"
        className="w-full border rounded-full px-4 py-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        onChange={(e) => setUserTyped(e.target.value.length > 0)}
      />
      <FaSearch className="absolute right-3 top-3 text-gray-400" />

      {/* Fake placeholder only if user hasn't typed */}
      {!userTyped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {basePrefix + text}
          <span className="inline-block w-[1px] ml-1">{blink ? "|" : " "}</span>
        </span>
      )}
    </div>
  );
}
