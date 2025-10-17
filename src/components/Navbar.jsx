// src/components/Navbar.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

import { useEffect, useRef } from "react";

export default function Navbar({ user, role, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // 🧩 Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center py-4 px-6 bg-white shadow-sm font-inter">
      {/* Logo / Brand */}
      <Link
        to="/"
        className="text-2xl font-extrabold tracking-tight text-gray-900"
      >
        EVENTS
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center space-x-6">
        <Link
          to="/about"
          className="text-gray-700 hover:text-purple-600 transition"
        >
          About
        </Link>
        <Link
          to="/browse"
          className="text-gray-700 hover:text-purple-600 transition"
        >
          Browse
        </Link>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-purple-600 transition"
            >
              {user.email} ▼
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border rounded shadow-lg w-48 z-50">
                <Link
                  to="/dashboard"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>

                {/* Admin only: Post Event + My Events */}
                {role === "admin" && (
                  <>
                    <Link
                      to="/post"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      Post Event
                    </Link>
                    <Link
                      to="/myevents"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Events
                    </Link>
                  </>
                )}

                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              to="/auth"
              className="px-4 py-2 bg-purple-600 text-white rounded-full shadow hover:bg-purple-800 transition"
            >
              Sign In
            </Link>
          </>
        )}
      </nav>

      {/* Mobile Hamburger */}
      <div className="md:hidden">
        <button
          onClick={toggleMenu}
          className="text-gray-700 focus:outline-none text-2xl"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-16 right-0 bg-white border rounded shadow-md w-48 md:hidden z-50">
          <Link
            to="/about"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>
          <Link
            to="/browse"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="block px-4 py-2 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>

              {role === "admin" && (
                <>
                  <Link
                    to="/post"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Post Event
                  </Link>
                  <Link
                    to="/myevents"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Events
                  </Link>
                </>
              )}
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="block px-4 py-2 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
